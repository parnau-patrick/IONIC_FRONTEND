import axios from 'axios';
import { Item } from '../types/Item';

const API_URL = 'http://localhost:3000';

export const itemApi = {
  getAllItems: async (): Promise<Item[]> => {
    const response = await axios.get(`${API_URL}/item`);
    return response.data;
  },

  getItemById: async (id: number): Promise<Item> => {
    const response = await axios.get(`${API_URL}/item/${id}`);
    return response.data;
  },

  createItem: async (item: Partial<Item>): Promise<Item> => {
    const response = await axios.post(`${API_URL}/item`, item);
    return response.data;
  },

  updateItem: async (id: number, item: Item): Promise<Item> => {
    const response = await axios.put(`${API_URL}/item/${id}`, item, {
      headers: {
        'ETag': item.version.toString()
      }
    });
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/item/${id}`);
  },

  searchItems: async (text: string): Promise<Item[]> => {
    const response = await axios.get(`${API_URL}/item?text=${text}`);
    return response.data;
  }
};