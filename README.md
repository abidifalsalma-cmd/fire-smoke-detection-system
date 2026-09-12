# 🔥 Fire & Smoke Detection System

AI-based fire and smoke detection system developed using **YOLO11, FastAPI, React and OpenCV**.

The application analyzes surveillance camera feeds, images and videos to detect **fire** and **smoke**, generate alerts and store incident information.

## 🎯 Project Objective

The objective of this project is to improve fire monitoring in industrial environments by using artificial intelligence to detect fire and smoke from CCTV footage.

The system can:

- Detect fire and smoke using a trained YOLO model
- Analyze images and videos
- Monitor multiple surveillance cameras
- Trigger audible alerts
- Send email notifications
- Store detected incidents
- Display incident history and statistics
- Manage cameras and system settings

## 🧠 AI Model

The detection model is based on **YOLO11**.

Classes:

- `fire`
- `smoke`

Model used by the application:

```text
models/best.pt