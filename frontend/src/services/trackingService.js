import { auth } from '../firebaseConfig';

class TrackingService {
  constructor() {
    this.STORAGE_KEY = 'user_interactions';
    this.INTERACTION_TYPES = {
      VIEW: 'view',
      HOVER: 'hover',
      CLICK: 'click',
      TIME_SPENT: 'time_spent'
    };
  }

  // Lấy userId nếu đã login, không thì dùng sessionId
  getUserIdentifier() {
    return auth.currentUser?.uid || sessionStorage.getItem('sessionId') || this.generateSessionId();
  }

  generateSessionId() {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
    return sessionId;
  }

  // Lưu interaction vào localStorage và/hoặc gửi lên server
  async trackInteraction(itemId, itemType, interactionType, metadata = {}) {
    const interaction = {
      userId: this.getUserIdentifier(),
      itemId,
      itemType, // 'movie', 'anime', 'book', etc.
      interactionType,
      timestamp: Date.now(),
      metadata
    };

    // Lưu local
    this.saveLocalInteraction(interaction);

    // Gửi lên server (async)
    try {
      await this.sendToServer(interaction);
    } catch (error) {
      console.error('Failed to send interaction to server:', error);
      // Lưu vào queue để thử lại sau
      this.queueFailedInteraction(interaction);
    }
  }

  // Lưu vào localStorage
  saveLocalInteraction(interaction) {
    const interactions = this.getLocalInteractions();
    interactions.push(interaction);
    
    // Giới hạn số lượng interactions được lưu
    const MAX_STORED_INTERACTIONS = 1000;
    if (interactions.length > MAX_STORED_INTERACTIONS) {
      interactions.shift(); // Xóa interaction cũ nhất
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
  }

  // Lấy interactions từ localStorage
  getLocalInteractions() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Gửi lên server
  async sendToServer(interaction) {
    const response = await fetch('/api/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(interaction)
    });

    if (!response.ok) {
      throw new Error('Failed to send interaction');
    }
  }

  // Queue failed interactions để thử lại sau
  queueFailedInteraction(interaction) {
    const QUEUE_KEY = 'failed_interactions_queue';
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(interaction);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  // Tính điểm ưu tiên cho item dựa trên interactions
  calculatePriorityScore(itemId, itemType) {
    const interactions = this.getLocalInteractions()
      .filter(i => i.itemId === itemId && i.itemType === itemType);

    let score = 0;
    const now = Date.now();
    
    interactions.forEach(interaction => {
      // Tính trọng số dựa vào thời gian (càng gần đây càng quan trọng)
      const daysSinceInteraction = (now - interaction.timestamp) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.exp(-daysSinceInteraction / 30); // exponential decay over 30 days

      // Điểm cho từng loại interaction
      switch (interaction.interactionType) {
        case this.INTERACTION_TYPES.VIEW:
          score += 1 * timeWeight;
          break;
        case this.INTERACTION_TYPES.HOVER:
          score += 0.5 * timeWeight;
          break;
        case this.INTERACTION_TYPES.CLICK:
          score += 2 * timeWeight;
          break;
        case this.INTERACTION_TYPES.TIME_SPENT:
          // Điểm dựa vào thời gian xem (tính theo phút)
          const minutesSpent = interaction.metadata.duration / 60000;
          score += Math.min(minutesSpent * 0.5, 5) * timeWeight; // max 5 điểm
          break;
      }
    });

    return score;
  }
}

export const trackingService = new TrackingService();