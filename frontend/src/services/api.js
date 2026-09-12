import axios from "axios";


export const API_BASE_URL = "http://127.0.0.1:8001";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30 * 60 * 1000,
});


api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(
      localStorage.getItem("menara-fire-session")
    );

    if (session?.accessToken) {
      config.headers.Authorization =
        `Bearer ${session.accessToken}`;
    }
  } catch {
    // La requête continue sans jeton.
  }

  return config;
});


export async function checkBackendHealth() {
  const response = await api.get("/health");

  return response.data;
}


export async function detectImage(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/api/detection/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}


export async function detectVideo(
  file,
  onUploadProgress,
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/api/detection/video",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      onUploadProgress: (progressEvent) => {
        if (
          !onUploadProgress
          || !progressEvent.total
        ) {
          return;
        }

        const percentage = Math.round(
          (progressEvent.loaded * 100)
          / progressEvent.total
        );

        onUploadProgress(percentage);
      },
    }
  );

  return {
    ...response.data,
    video_url:
      `${API_BASE_URL}${response.data.video_url}`,
  };
}


export async function getUsers() {
  const response = await api.get(
    "/api/users"
  );

  return response.data;
}


export async function addUser(userData) {
  const response = await api.post(
    "/api/users",
    userData
  );

  return response.data;
}


export async function updateUser(
  userId,
  userData,
) {
  const response = await api.patch(
    `/api/users/${userId}`,
    userData
  );

  return response.data;
}

export async function analyzeWebcamFrame(
  sessionId,
  frameBlob,
) {
  const formData = new FormData();

  formData.append(
    "session_id",
    sessionId,
  );

  formData.append(
    "frame",
    frameBlob,
    "webcam-frame.jpg",
  );

  const response = await api.post(
    "/api/webcam/frame",
    formData,
  );

  return response.data;
}


export async function resetWebcamSession(
  sessionId,
) {
  const response = await api.delete(
    `/api/webcam/session/${encodeURIComponent(
      sessionId
    )}`
  );

  return response.data;
}

export default api;