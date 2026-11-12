import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";

export function usePhotoCapture() {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const take = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is off. Allow it in Settings, or choose a photo from your library.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) setUri(asset.uri);
  }, []);

  const choose = useCallback(async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) setUri(asset.uri);
  }, []);

  const clear = useCallback(() => setUri(null), []);
  return { uri, error, take, choose, clear };
}
