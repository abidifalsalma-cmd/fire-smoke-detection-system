from collections import deque
from pathlib import Path
import base64
import subprocess

import cv2
import numpy as np
from ultralytics import YOLO


class DetectorService:
    def __init__(
        self,
        confidence: float = 0.05,
        confirmation_frames: int = 5,
        video_stride: int = 5,
        video_imgsz: int = 800,
    ):
        application_dir = Path(__file__).resolve().parents[3]

        self.model_path = (
            application_dir
            / "models"
            / "best.pt"
        )

        # Seuil YOLO minimum pour récupérer
        # aussi les prédictions faibles.
        self.confidence = confidence

        # ====================================================
        # CONFIGURATION FINALE VALIDÉE
        # ====================================================

        # Activation
        self.fire_on = 0.30
        self.smoke_on = 0.15

        # Maintien / hystérésis
        self.fire_keep = 0.18
        self.smoke_keep = 0.08

       # Fenêtre temporelle plus longue :
# on observe environ 2 secondes avant confirmation.
        self.window = 20

# Fire/Smoke doivent apparaître dans au moins
# 8 des 20 frames analysées pour confirmer l'incident.
        self.min_confirm = 8

# Une fois confirmé, l'incident reste actif tant
# qu'il existe suffisamment de preuves.
        self.min_keep = 3

        # 1 frame analysée sur 3
        self.video_stride = video_stride

        # Taille utilisée pendant les tests finaux
        self.video_imgsz = video_imgsz

        # Conservé pour compatibilité API/frontend
        self.confirmation_frames = confirmation_frames

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Modèle YOLO introuvable : {self.model_path}"
            )

        self.model = YOLO(str(self.model_path))

    # ========================================================
    # IMAGE
    # ========================================================

    def detect_image_bytes(
        self,
        image_bytes: bytes,
    ) -> dict:

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise ValueError(
                "Le fichier envoyé n’est pas une image valide."
            )

        results = self.model.predict(
            source=image,
            conf=self.confidence,
            imgsz=800,
            verbose=False,
        )

        result = results[0]

        detections = []

        fire_count = 0
        smoke_count = 0

        maximum_confidence = 0.0

        if result.boxes is not None:

            for box in result.boxes:

                class_id = int(
                    box.cls[0].item()
                )

                class_name = str(
                    self.model.names[class_id]
                ).lower()

                box_confidence = float(
                    box.conf[0].item()
                )

                # --------------------------------------------
                # SEUILS PAR CLASSE
                # --------------------------------------------

                if (
                    class_name == "fire"
                    and box_confidence < self.fire_on
                ):
                    continue

                if (
                    class_name == "smoke"
                    and box_confidence < self.smoke_on
                ):
                    continue

                x1, y1, x2, y2 = (
                    box.xyxy[0].tolist()
                )

                detections.append(
                    {
                        "class_id": class_id,
                        "class_name": class_name,
                        "confidence": round(
                            box_confidence,
                            3,
                        ),
                        "bbox": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2),
                        },
                    }
                )

                maximum_confidence = max(
                    maximum_confidence,
                    box_confidence,
                )

                if class_name == "fire":
                    fire_count += 1

                elif class_name == "smoke":
                    smoke_count += 1

        # ====================================================
        # ANNOTATION IMAGE
        # ========================================================

        annotated_image = image.copy()

        for detection in detections:

            class_name = detection[
                "class_name"
            ]

            box_confidence = detection[
                "confidence"
            ]

            bbox = detection["bbox"]

            x1 = int(bbox["x1"])
            y1 = int(bbox["y1"])
            x2 = int(bbox["x2"])
            y2 = int(bbox["y2"])

            if class_name == "fire":
                color = (0, 0, 255)
            else:
                color = (0, 165, 255)

            cv2.rectangle(
                annotated_image,
                (x1, y1),
                (x2, y2),
                color,
                2,
            )

            label = (
                f"{class_name} "
                f"{box_confidence:.2f}"
            )

            cv2.putText(
                annotated_image,
                label,
                (x1, max(y1 - 8, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
                cv2.LINE_AA,
            )

        success, encoded_image = cv2.imencode(
            ".jpg",
            annotated_image,
        )

        if not success:
            raise RuntimeError(
                "Impossible de générer l’image annotée."
            )

        annotated_image_base64 = (
            base64.b64encode(
                encoded_image.tobytes()
            ).decode("utf-8")
        )

        return {
            "detections": detections,
            "total_detections": len(
                detections
            ),
            "fire_count": fire_count,
            "smoke_count": smoke_count,
            "maximum_confidence": round(
                maximum_confidence,
                3,
            ),
            "has_incident": (
                fire_count > 0
                or smoke_count > 0
            ),
            "annotated_image": (
                "data:image/jpeg;base64,"
                f"{annotated_image_base64}"
            ),
        }

    # ========================================================
    # VIDEO
    # ========================================================

    def detect_video_file(
        self,
        video_path: Path,
        raw_output_path: Path,
        final_output_path: Path,
    ) -> dict:

        video_path = Path(
            video_path
        )

        raw_output_path = Path(
            raw_output_path
        )

        final_output_path = Path(
            final_output_path
        )

        if not video_path.exists():
            raise FileNotFoundError(
                f"Vidéo introuvable : {video_path}"
            )

        capture = cv2.VideoCapture(
            str(video_path)
        )

        if not capture.isOpened():
            raise ValueError(
                "Impossible d’ouvrir la vidéo envoyée."
            )

        fps = capture.get(
            cv2.CAP_PROP_FPS
        )

        if not fps or fps <= 0:
            fps = 25.0

        width = int(
            capture.get(
                cv2.CAP_PROP_FRAME_WIDTH
            )
        )

        height = int(
            capture.get(
                cv2.CAP_PROP_FRAME_HEIGHT
            )
        )

        if width <= 0 or height <= 0:

            capture.release()

            raise ValueError(
                "Les dimensions de la vidéo sont invalides."
            )

        raw_output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        final_output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        fourcc = cv2.VideoWriter_fourcc(
            *"mp4v"
        )

        writer = cv2.VideoWriter(
            str(raw_output_path),
            fourcc,
            fps,
            (width, height),
        )

        if not writer.isOpened():

            capture.release()

            raise RuntimeError(
                "Impossible de créer la vidéo de sortie."
            )

        # ====================================================
        # HISTORIQUES TEMPORELS
        # ====================================================

        fire_on_history = deque(
            maxlen=self.window
        )

        fire_keep_history = deque(
            maxlen=self.window
        )

        smoke_on_history = deque(
            maxlen=self.window
        )

        smoke_keep_history = deque(
            maxlen=self.window
        )

        fire_active = False
        smoke_active = False

        # ====================================================
        # COMPTEURS
        # ====================================================

        total_frames = 0
        analyzed_frames = 0

        fire_frames = 0
        smoke_frames = 0

        fire_detections = 0
        smoke_detections = 0

        maximum_confidence = 0.0

        transitions = 0

        previous_state = "NORMAL"
        current_state = "NORMAL"

        consecutive_incident_frames = 0
        maximum_consecutive_frames = 0

        last_detections = []

        try:

            while True:

                success, frame = capture.read()

                if not success:
                    break

                total_frames += 1

                should_analyze = (
                    (total_frames - 1)
                    % self.video_stride
                    == 0
                )

                annotated_frame = frame.copy()

                # =============================================
                # FRAME ANALYSÉE
                # =============================================

                if should_analyze:

                    analyzed_frames += 1

                    results = self.model.predict(
                        source=frame,
                        conf=self.confidence,
                        imgsz=self.video_imgsz,
                        verbose=False,
                    )

                    result = results[0]

                    raw_fire = 0.0
                    raw_smoke = 0.0

                    candidate_detections = []

                    if result.boxes is not None:

                        for box in result.boxes:

                            class_id = int(
                                box.cls[0].item()
                            )

                            class_name = str(
                                self.model.names[
                                    class_id
                                ]
                            ).lower()

                            box_confidence = float(
                                box.conf[0].item()
                            )

                            x1, y1, x2, y2 = (
                                box.xyxy[
                                    0
                                ].tolist()
                            )

                            if class_name == "fire":

                                raw_fire = max(
                                    raw_fire,
                                    box_confidence,
                                )

                            elif class_name == "smoke":

                                raw_smoke = max(
                                    raw_smoke,
                                    box_confidence,
                                )

                            candidate_detections.append(
                                {
                                    "class_name": class_name,
                                    "confidence": box_confidence,
                                    "bbox": (
                                        int(x1),
                                        int(y1),
                                        int(x2),
                                        int(y2),
                                    ),
                                }
                            )

                    # =========================================
                    # DEBUG TEMPORAIRE
                    # =========================================

                    if (
                        raw_fire >= 0.20
                        or raw_smoke >= 0.10
                    ):
                        time_sec = (
                            total_frames / fps
                            if fps > 0
                            else 0.0
                        )

                        print(
                            f"[DEBUG] {time_sec:6.2f}s | "
                            f"Fire={raw_fire:.3f} | "
                            f"Smoke={raw_smoke:.3f}"
                        )

                    # =========================================
                    # FIRE — HYSTÉRÉSIS
                    # =========================================

                    fire_on_history.append(
                        raw_fire >= self.fire_on
                    )

                    fire_keep_history.append(
                        raw_fire >= self.fire_keep
                    )

                    if not fire_active:

                        if (
                            sum(fire_on_history)
                            >= self.min_confirm
                        ):
                            fire_active = True

                    else:

                        if (
                            sum(fire_keep_history)
                            < self.min_keep
                        ):
                            fire_active = False

                    # =========================================
                    # SMOKE — HYSTÉRÉSIS
                    # =========================================

                    smoke_on_history.append(
                        raw_smoke >= self.smoke_on
                    )

                    smoke_keep_history.append(
                        raw_smoke >= self.smoke_keep
                    )

                    if not smoke_active:

                        if (
                            sum(smoke_on_history)
                            >= self.min_confirm
                        ):
                            smoke_active = True

                    else:

                        if (
                            sum(smoke_keep_history)
                            < self.min_keep
                        ):
                            smoke_active = False

                    # =========================================
                    # ÉTAT GLOBAL
                    # =========================================

                    if (
                        fire_active
                        and smoke_active
                    ):
                        current_state = (
                            "FIRE + SMOKE"
                        )

                    elif fire_active:
                        current_state = (
                            "FIRE"
                        )

                    elif smoke_active:
                        current_state = (
                            "SMOKE"
                        )

                    else:
                        current_state = (
                            "NORMAL"
                        )

                    # =========================================
                    # DÉTECTIONS À AFFICHER
                    # =========================================

                    last_detections = []

                    for detection in candidate_detections:

                        class_name = detection[
                            "class_name"
                        ]

                        box_confidence = detection[
                            "confidence"
                        ]

                        keep = False

                        if (
                            class_name == "fire"
                            and fire_active
                            and box_confidence
                            >= self.fire_keep
                        ):
                            keep = True

                        elif (
                            class_name == "smoke"
                            and smoke_active
                            and box_confidence
                            >= self.smoke_keep
                        ):
                            keep = True

                        if keep:

                            last_detections.append(
                                detection
                            )

                            maximum_confidence = max(
                                maximum_confidence,
                                box_confidence,
                            )

                            if class_name == "fire":
                                fire_detections += 1

                            elif class_name == "smoke":
                                smoke_detections += 1

                    # =========================================
                    # COMPTEURS CONFIRMÉS
                    # =========================================

                    if fire_active:
                        fire_frames += 1

                    if smoke_active:
                        smoke_frames += 1

                    if (
                        fire_active
                        or smoke_active
                    ):

                        consecutive_incident_frames += 1

                        maximum_consecutive_frames = max(
                            maximum_consecutive_frames,
                            consecutive_incident_frames,
                        )

                    else:
                        consecutive_incident_frames = 0

                    # =========================================
                    # TRANSITIONS
                    # =========================================

                    if (
                        current_state
                        != previous_state
                    ):

                        transitions += 1

                        previous_state = (
                            current_state
                        )

                # =============================================
                # ANNOTATION MANUELLE
                # =============================================

                for detection in last_detections:

                    class_name = detection[
                        "class_name"
                    ]

                    box_confidence = detection[
                        "confidence"
                    ]

                    x1, y1, x2, y2 = (
                        detection["bbox"]
                    )

                    if class_name == "fire":
                        color = (
                            0,
                            0,
                            255,
                        )

                    else:
                        color = (
                            0,
                            165,
                            255,
                        )

                    cv2.rectangle(
                        annotated_frame,
                        (x1, y1),
                        (x2, y2),
                        color,
                        2,
                    )

                    label = (
                        f"{class_name} "
                        f"{box_confidence:.2f}"
                    )

                    cv2.putText(
                        annotated_frame,
                        label,
                        (
                            x1,
                            max(
                                y1 - 8,
                                20,
                            ),
                        ),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        color,
                        2,
                        cv2.LINE_AA,
                    )

                # =============================================
                # ÉTAT À L'ÉCRAN
                # =============================================

                if current_state == "NORMAL":

                    state_label = (
                        "ETAT : NORMAL"
                    )

                    state_color = (
                        0,
                        180,
                        0,
                    )

                elif current_state == "FIRE":

                    state_label = (
                        "ALERTE : FIRE"
                    )

                    state_color = (
                        0,
                        0,
                        255,
                    )

                elif current_state == "SMOKE":

                    state_label = (
                        "ALERTE : SMOKE"
                    )

                    state_color = (
                        0,
                        165,
                        255,
                    )

                else:

                    state_label = (
                        "ALERTE : "
                        "FIRE + SMOKE"
                    )

                    state_color = (
                        0,
                        0,
                        255,
                    )

                cv2.putText(
                    annotated_frame,
                    state_label,
                    (25, 45),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    state_color,
                    3,
                    cv2.LINE_AA,
                )

                writer.write(
                    annotated_frame
                )

        finally:

            capture.release()
            writer.release()

        # ====================================================
        # VÉRIFICATION
        # ====================================================

        if total_frames == 0:

            raise ValueError(
                "La vidéo ne contient aucune frame exploitable."
            )

        # ====================================================
        # CONVERSION H264
        # ====================================================

        ffmpeg_command = [
            "ffmpeg",
            "-y",
            "-i",
            str(raw_output_path),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "24",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(final_output_path),
        ]

        conversion = subprocess.run(
            ffmpeg_command,
            capture_output=True,
            text=True,
        )

        if (
            conversion.returncode != 0
            or not final_output_path.exists()
        ):

            raise RuntimeError(
                "La conversion H.264 "
                "de la vidéo a échoué."
            )

        if raw_output_path.exists():
            raw_output_path.unlink()

        duration_seconds = (
            total_frames / fps
        )

        # ====================================================
        # INCIDENT FINAL
        # ====================================================

        incident_confirmed = (
            fire_frames > 0
            or smoke_frames > 0
        )

        # ====================================================
        # RÉPONSE
        # ====================================================

        return {
            "total_frames": total_frames,
            "analyzed_frames": analyzed_frames,

            "video_stride": (
                self.video_stride
            ),

            "video_imgsz": (
                self.video_imgsz
            ),

            "fps": round(
                fps,
                2,
            ),

            "duration_seconds": round(
                duration_seconds,
                2,
            ),

            "fire_frames": (
                fire_frames
            ),

            "smoke_frames": (
                smoke_frames
            ),

            "fire_detections": (
                fire_detections
            ),

            "smoke_detections": (
                smoke_detections
            ),

            "maximum_confidence": round(
                maximum_confidence,
                3,
            ),

            "maximum_consecutive_frames": (
                maximum_consecutive_frames
            ),

            "confirmation_frames": (
                self.min_confirm
            ),

            "has_incident": (
                incident_confirmed
            ),

            "final_state": (
                current_state
            ),

            "transitions": (
                transitions
            ),

            "fire_on": (
                self.fire_on
            ),

            "smoke_on": (
                self.smoke_on
            ),

            "output_path": str(
                final_output_path
            ),
        }