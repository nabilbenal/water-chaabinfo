import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export async function takePhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      width: 1024,
    });
    return photo.dataUrl || null;
  } catch (e) {
    console.warn('Camera not available, using fallback');
    return null;
  }
}

export async function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn('Geolocation not available');
    return null;
  }
}
