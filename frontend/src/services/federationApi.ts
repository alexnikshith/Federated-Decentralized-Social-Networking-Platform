const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Instance info response from /.well-known/instance-info
interface InstanceInfo {
  instance: string;
  domain: string;
  federation: boolean;
  inbox: string;
  version: string;
}

// Instance from /api/federation/instances
export interface FederatedInstance {
  instance: string;
  domain: string;
  trust_level: string;
  is_local: boolean;
}

// Federation API service
export const federationApi = {
  /**
   * Get instance info from /.well-known/instance-info
   */
  async getInstanceInfo(domain: string): Promise<InstanceInfo> {
    const url = domain.startsWith('http') ? domain : `http://${domain}`;
    const response = await fetch(`${url}/.well-known/instance-info`);
    if (!response.ok) {
      throw new Error('Failed to fetch instance info');
    }
    return response.json();
  },

  /**
   * Get list of all federated instances (local + trusted remote)
   */
  async getKnownInstances(): Promise<FederatedInstance[]> {
    const response = await fetch(`${API_URL}/api/federation/instances`);
    if (!response.ok) {
      throw new Error('Failed to fetch federated instances');
    }
    return response.json();
  },

  /**
   * Get federated feed (combines local and remote posts)
   * This uses the existing /api/feed endpoint which already returns federated content
   */
  async getFederatedFeed(token: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/feed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch federated feed');
    }
    return response.json();
  },
};
