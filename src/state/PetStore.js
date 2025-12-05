import { PetProfile } from './PetProfile.js';
import { Pet } from '../entities/Pet.js';

const STORAGE_KEY = 'digital_muse_pet_profile';

class PetStoreClass {
  constructor() {
    this.profile = null; // PetProfile
    // Pet instances are scene-owned; do not keep a single cross-scene instance here
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        this.profile = PetProfile.fromJSON(obj);
      }
    } catch (e) {
      console.warn('Failed to load pet profile', e);
      this.profile = null;
    }
  }

  saveToStorage() {
    if (!this.profile) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile.toJSON()));
    } catch (e) {
      console.warn('Failed to save pet profile', e);
    }
  }

  createProfile(attrs = {}) {
    this.profile = new PetProfile(attrs);
    this.saveToStorage();
    return this.profile;
  }

  getProfile() {
    return this.profile;
  }

  // Returns an existing live Pet instance for the scene, or creates one.
  // scene: Phaser.Scene, x,y: position, opts: passed to Pet constructor
  getOrCreateInstance(scene, x = 100, y = 100, opts = {}) {
    if (!this.profile) {
      // create a default profile if none exists
      this.createProfile({ name: 'Rollen' });
    }

    // Always create a new Pet instance for the requesting scene so the scene owns its lifecycle.
    // This avoids cross-scene reuse issues and lifecycle races during transitions.
    const pet = new Pet(scene, x, y, opts, this.profile);
    return pet;
  }

  // Replace profile and optionally recreate instance
  setProfile(profile, recreate = true, scene = null, x = 100, y = 100, opts = {}) {
    this.profile = profile instanceof PetProfile ? profile : PetProfile.fromJSON(profile);
    this.saveToStorage();
    // If caller requests recreation they can create a new Pet from the returned profile.
    return this.profile;
  }
}

export const PetStore = new PetStoreClass();
