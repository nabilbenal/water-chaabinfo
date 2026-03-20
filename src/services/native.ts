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
  // Try Capacitor first
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn('Capacitor Geolocation not available, trying web fallback');
  }

  // Web browser fallback
  if ('geolocation' in navigator) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => { console.warn('Web geolocation error:', err.message); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  console.warn('No geolocation available');
  return null;
}
