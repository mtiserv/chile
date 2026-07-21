// indexeddb.js - IndexedDB Manager for Offline-First Data and Media Storage
const DB_NAME = "MTI_CMMS_OFFLINE_DB";
const DB_VERSION = 2;

class MTI_OfflineDB {
  constructor() {
    this.db = null;
  }

  // Initialize and open database
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Store 1: Cached main JSON database
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
        
        // Store 2: Offline sync queue for transactions
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true });
        }
        
        // Store 3: Offline image Blobs
        if (!db.objectStoreNames.contains("offline_photos")) {
          db.createObjectStore("offline_photos", { keyPath: "id" });
        }

        // Store 4: Offline Projects & Bitácoras
        if (!db.objectStoreNames.contains("offline_projects")) {
          db.createObjectStore("offline_projects", { keyPath: "id" });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        console.log("IndexedDB inicializado correctamente.");
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error("Error al abrir IndexedDB:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  // Cached Database Operations
  async getCachedDatabase() {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction("cache", "readonly");
      const store = transaction.objectStore("cache");
      const request = store.get("db_state");

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async saveCachedDatabase(data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("cache", "readwrite");
      const store = transaction.objectStore("cache");
      const request = store.put({ key: "db_state", data: data, timestamp: Date.now() });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Sync Queue Operations
  async getSyncQueue() {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction("sync_queue", "readonly");
      const store = transaction.objectStore("sync_queue");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => resolve([]);
    });
  }

  async addToSyncQueue(action, payload) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");
      const item = {
        action: action,
        payload: payload,
        timestamp: Date.now()
      };
      const request = store.add(item);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFromSyncQueue(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Image Blobs Storage Operations
  async saveOfflinePhoto(id, blob, mimeType, originalName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("offline_photos", "readwrite");
      const store = transaction.objectStore("offline_photos");
      const photoItem = {
        id: id,
        blob: blob,
        mimeType: mimeType,
        name: originalName,
        timestamp: Date.now()
      };
      const request = store.put(photoItem);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflinePhoto(id) {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction("offline_photos", "readonly");
      const store = transaction.objectStore("offline_photos");
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async deleteOfflinePhoto(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("offline_photos", "readwrite");
      const store = transaction.objectStore("offline_photos");
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Projects Operations
  async getOfflineProjects() {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction("offline_projects", "readonly");
      const store = transaction.objectStore("offline_projects");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async saveOfflineProject(project) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("offline_projects", "readwrite");
      const store = transaction.objectStore("offline_projects");
      const request = store.put(project);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineProject(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("offline_projects", "readwrite");
      const store = transaction.objectStore("offline_projects");
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}

// Export a single global instance for the application
window.dbStore = new MTI_OfflineDB();

