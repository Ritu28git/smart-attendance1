
import * as faceapi from "@vladmandic/face-api";

let modelsPromise = null;

export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).catch((error) => {
      modelsPromise = null;
      throw error;
    });
  }


  return modelsPromise;
}

export async function getFaceDescriptor(video) {
  if (!video) {
    throw new Error("Camera video is unavailable.");
  }

  await loadFaceModels();

  if (
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    throw new Error("Camera is not ready. Please reopen it and try again.");
  }

  const result = await faceapi
    .detectSingleFace(
      video,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.1,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) {
    throw new Error(
      "Face not detected. Look directly at the camera in good lighting."
    );
  }

  return Array.from(result.descriptor);
}
