import base64
from collections import deque
from threading import Lock

import cv2
import numpy as np

from app.services.detector_service import DetectorService


class WebcamSession:
    def __init__(
        self,
        detector: DetectorService,
    ):
        self.detector = detector

        self.fire_on_history = deque(
            maxlen=detector.window
        )
        self.fire_keep_history = deque(
            maxlen=detector.window
        )
        self.smoke_on_history = deque(
            maxlen=detector.window
        )
        self.smoke_keep_history = deque(
            maxlen=detector.window
        )

        self.fire_active = False
        self.smoke_active = False
        self.previous_state = "NORMAL"
        self.analyzed_frames = 0

    def analyze_frame(
        self,
        image_bytes: bytes,
    ) -> dict:
        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if frame is None:
            raise ValueError(
                "La frame webcam reçue est invalide."
            )

        results = self.detector.model.predict(
            source=frame,
            conf=self.detector.confidence,
            imgsz=self.detector.video_imgsz,
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
                    self.detector.model.names[
                        class_id
                    ]
                ).lower()

                confidence = float(
                    box.conf[0].item()
                )

                x1, y1, x2, y2 = (
                    box.xyxy[0].tolist()
                )

                if class_name == "fire":
                    raw_fire = max(
                        raw_fire,
                        confidence,
                    )

                elif class_name == "smoke":
                    raw_smoke = max(
                        raw_smoke,
                        confidence,
                    )

                candidate_detections.append(
                    {
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": (
                            int(x1),
                            int(y1),
                            int(x2),
                            int(y2),
                        ),
                    }
                )

        self.fire_on_history.append(
            raw_fire >= self.detector.fire_on
        )
        self.fire_keep_history.append(
            raw_fire >= self.detector.fire_keep
        )
        self.smoke_on_history.append(
            raw_smoke >= self.detector.smoke_on
        )
        self.smoke_keep_history.append(
            raw_smoke >= self.detector.smoke_keep
        )

        if not self.fire_active:
            if (
                sum(self.fire_on_history)
                >= self.detector.min_confirm
            ):
                self.fire_active = True
        elif (
            sum(self.fire_keep_history)
            < self.detector.min_keep
        ):
            self.fire_active = False

        if not self.smoke_active:
            if (
                sum(self.smoke_on_history)
                >= self.detector.min_confirm
            ):
                self.smoke_active = True
        elif (
            sum(self.smoke_keep_history)
            < self.detector.min_keep
        ):
            self.smoke_active = False

        if self.fire_active and self.smoke_active:
            current_state = "FIRE + SMOKE"
        elif self.fire_active:
            current_state = "FIRE"
        elif self.smoke_active:
            current_state = "SMOKE"
        else:
            current_state = "NORMAL"

        new_incident = (
            self.previous_state == "NORMAL"
            and current_state != "NORMAL"
        )

        self.previous_state = current_state
        self.analyzed_frames += 1

        annotated_frame = frame.copy()
        displayed_detections = []

        for detection in candidate_detections:
            class_name = detection["class_name"]
            confidence = detection["confidence"]

            should_display = (
                class_name == "fire"
                and self.fire_active
                and confidence
                >= self.detector.fire_keep
            ) or (
                class_name == "smoke"
                and self.smoke_active
                and confidence
                >= self.detector.smoke_keep
            )

            if not should_display:
                continue

            x1, y1, x2, y2 = detection["bbox"]

            color = (
                (0, 0, 255)
                if class_name == "fire"
                else (0, 165, 255)
            )

            cv2.rectangle(
                annotated_frame,
                (x1, y1),
                (x2, y2),
                color,
                2,
            )

            cv2.putText(
                annotated_frame,
                f"{class_name} {confidence:.2f}",
                (x1, max(y1 - 8, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
                cv2.LINE_AA,
            )

            displayed_detections.append(
                {
                    "class_name": class_name,
                    "confidence": round(
                        confidence,
                        3,
                    ),
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                }
            )

        state_color = (
            (0, 180, 0)
            if current_state == "NORMAL"
            else (0, 0, 255)
        )

        cv2.putText(
            annotated_frame,
            f"ETAT : {current_state}",
            (25, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            state_color,
            3,
            cv2.LINE_AA,
        )

        success, encoded_frame = cv2.imencode(
            ".jpg",
            annotated_frame,
        )

        if not success:
            raise RuntimeError(
                "Impossible d’annoter la frame webcam."
            )

        frame_base64 = base64.b64encode(
            encoded_frame.tobytes()
        ).decode("utf-8")

        return {
            "state": current_state,
            "has_incident": (
                current_state != "NORMAL"
            ),
            "new_incident": new_incident,
            "fire_active": self.fire_active,
            "smoke_active": self.smoke_active,
            "fire_confidence": round(
                raw_fire,
                3,
            ),
            "smoke_confidence": round(
                raw_smoke,
                3,
            ),
            "maximum_confidence": round(
                max(raw_fire, raw_smoke),
                3,
            ),
            "analyzed_frames": self.analyzed_frames,
            "detections": displayed_detections,
            "annotated_frame": (
                "data:image/jpeg;base64,"
                f"{frame_base64}"
            ),
        }


class WebcamService:
    def __init__(
        self,
        detector: DetectorService,
    ):
        self.detector = detector
        self.sessions = {}
        self.lock = Lock()

    def analyze_frame(
        self,
        session_id: str,
        image_bytes: bytes,
    ) -> dict:
        with self.lock:
            if session_id not in self.sessions:
                self.sessions[
                    session_id
                ] = WebcamSession(
                    self.detector
                )

            session = self.sessions[
                session_id
            ]

            return session.analyze_frame(
                image_bytes
            )

    def reset_session(
        self,
        session_id: str,
    ) -> None:
        with self.lock:
            self.sessions.pop(
                session_id,
                None,
            )