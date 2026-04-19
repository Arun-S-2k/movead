import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'movead_session';

export const store: Record<string, any> = {
  id: null,
  name: '',
  mobile: '',
  email: '',
  vehicleNumber: '',
  brand: '',
  model: '',
  fuelType: '',
};

// Simple auth state listener so _layout can react to login/logout
let _authListener: ((loggedIn: boolean) => void) | null = null;
export const setAuthListener = (cb: (loggedIn: boolean) => void) => { _authListener = cb; };

export const saveSession = async () => {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
    _authListener?.(!!store.id);
  } catch (e) {
    console.log('Failed to save session', e);
  }
};

export const loadSession = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      Object.assign(store, parsed);
      return !!store.id; // Return true if user is logged in
    }
  } catch (e) {
    console.log('Failed to load session', e);
  }
  return false;
};

export const clearSession = async () => {
  try {
    store.id = null;
    store.name = '';
    store.mobile = '';
    store.email = '';
    store.vehicleNumber = '';
    store.brand = '';
    store.model = '';
    store.fuelType = '';
    await AsyncStorage.removeItem(STORE_KEY);
    _authListener?.(false);
  } catch (e) {
    console.log('Failed to clear session', e);
  }
};