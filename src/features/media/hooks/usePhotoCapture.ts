import { useCallback, useState } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { planPhoto } from "../lib/photo-rules";

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
  contentType: "image/jpeg";
}

/**
 * Take or choose a photo and make it upload-ready (guide §2.6): JPEG, longest side ≤ 4096 px,
 * at least 64 px, re-encoded so EXIF is stripped and HEIC/WebP become JPEG.
 */
export function usePhotoCapture() {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const prepare = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const plan = planPhoto({ width: asset.width, height: asset.height });
    if (!plan.ok) {
      setError(plan.reason);
      return;
    }
    setPreparing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        asset.uri,
        plan.resize ? [{ resize: plan.resize }] : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhoto({
        uri: result.uri,
        width: result.width,
        height: result.height,
        contentType: "image/jpeg",
      });
    } catch {
      setError("Couldn't prepare that photo. Try another one.");
    } finally {
      setPreparing(false);
    }
  }, []);

  const take = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is off. Allow it in Settings, or choose a photo from your library.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) await prepare(asset);
  }, [prepare]);

  const choose = useCallback(async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) await prepare(asset);
  }, [prepare]);

  const clear = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return { photo, error, preparing, take, choose, clear };
}

export type PhotoCapture = ReturnType<typeof usePhotoCapture>;
