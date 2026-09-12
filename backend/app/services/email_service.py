import logging
import os
import smtplib
from email.message import EmailMessage
from threading import Thread

from dotenv import load_dotenv


load_dotenv()

logger = logging.getLogger(__name__)


def _build_detection_label(
    detected_fire: bool,
    detected_smoke: bool,
) -> str:
    if detected_fire and detected_smoke:
        return "Feu et fumée"

    if detected_fire:
        return "Feu"

    return "Fumée"


def _send_incident_alert(
    *,
    incident_id: int,
    location: str,
    source_type: str,
    detected_fire: bool,
    detected_smoke: bool,
    maximum_confidence: float,
    severity: str,
) -> None:
    sender_email = os.getenv(
        "MENARA_SMTP_EMAIL",
        "",
    ).strip()

    app_password = os.getenv(
        "MENARA_SMTP_APP_PASSWORD",
        "",
    ).replace(" ", "")

    recipient_email = os.getenv(
        "MENARA_ALERT_RECIPIENT",
        "",
    ).strip()

    if (
        not sender_email
        or not app_password
        or not recipient_email
    ):
        logger.warning(
            "Alerte e-mail non envoyée : "
            "configuration SMTP incomplète."
        )
        return

    detection_label = _build_detection_label(
        detected_fire,
        detected_smoke,
    )

    confidence_percent = round(
        maximum_confidence * 100,
        1,
    )

    message = EmailMessage()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = (
        f"[MENARA FIRE SAFETY] Alerte {detection_label} "
        f"— Incident #{incident_id}"
    )

    message.set_content(
        "Une nouvelle alerte a été détectée.\n\n"
        f"Incident : #{incident_id}\n"
        f"Détection : {detection_label}\n"
        f"Zone : {location}\n"
        f"Source : {source_type}\n"
        f"Gravité : {severity}\n"
        f"Confiance maximale : {confidence_percent} %\n\n"
        "Connectez-vous à Menara Fire Safety pour consulter "
        "et prendre en charge l’incident."
    )

    try:
        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=15,
        ) as smtp:
            smtp.login(
                sender_email,
                app_password,
            )
            smtp.send_message(message)

        logger.info(
            "Alerte e-mail envoyée pour l’incident %s.",
            incident_id,
        )

    except Exception:
        logger.exception(
            "Échec de l’envoi de l’alerte "
            "pour l’incident %s.",
            incident_id,
        )


def send_incident_alert_async(
    *,
    incident_id: int,
    location: str,
    source_type: str,
    detected_fire: bool,
    detected_smoke: bool,
    maximum_confidence: float,
    severity: str,
) -> None:
    Thread(
        target=_send_incident_alert,
        kwargs={
            "incident_id": incident_id,
            "location": location,
            "source_type": source_type,
            "detected_fire": detected_fire,
            "detected_smoke": detected_smoke,
            "maximum_confidence": maximum_confidence,
            "severity": severity,
        },
        daemon=True,
        name=f"incident-email-{incident_id}",
    ).start()


def _send_password_reset_email(
    *,
    recipient_email: str,
    reset_token: str,
) -> None:
    sender_email = os.getenv(
        "MENARA_SMTP_EMAIL",
        "",
    ).strip()

    app_password = os.getenv(
        "MENARA_SMTP_APP_PASSWORD",
        "",
    ).replace(" ", "")

    frontend_url = os.getenv(
        "MENARA_FRONTEND_URL",
        "http://127.0.0.1:5173",
    ).rstrip("/")

    reset_recipient = os.getenv(
        "MENARA_PASSWORD_RESET_RECIPIENT",
        recipient_email,
    ).strip()

    if (
        not sender_email
        or not app_password
        or not reset_recipient
    ):
        logger.warning(
            "E-mail de réinitialisation non envoyé : "
            "configuration SMTP incomplète."
        )
        return

    reset_url = (
        f"{frontend_url}/reinitialiser-mot-de-passe"
        f"?token={reset_token}"
    )

    message = EmailMessage()
    message["From"] = sender_email
    message["To"] = reset_recipient
    message["Subject"] = (
        "[MENARA FIRE SAFETY] "
        "Réinitialisation du mot de passe"
    )

    message.set_content(
        "Une demande de réinitialisation de votre mot de passe "
        "a été effectuée.\n\n"
        "Utilisez le lien suivant dans les 15 prochaines minutes :\n\n"
        f"{reset_url}\n\n"
        "Si vous n’avez pas demandé cette modification, "
        "ignorez simplement cet e-mail."
    )

    try:
        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=15,
        ) as smtp:
            smtp.login(
                sender_email,
                app_password,
            )
            smtp.send_message(message)

        logger.info(
            "E-mail de réinitialisation envoyé à %s.",
            reset_recipient,
        )

    except Exception:
        logger.exception(
            "Échec de l’envoi de l’e-mail "
            "de réinitialisation."
        )


def send_password_reset_email_async(
    *,
    recipient_email: str,
    reset_token: str,
) -> None:
    Thread(
        target=_send_password_reset_email,
        kwargs={
            "recipient_email": recipient_email,
            "reset_token": reset_token,
        },
        daemon=True,
        name="password-reset-email",
    ).start()