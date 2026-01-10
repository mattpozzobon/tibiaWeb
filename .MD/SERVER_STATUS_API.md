# Server Status API

## Endpoint

**GET** `/api/status`

Returns server status and player count information.

## Response Format

```json
{
  "status": "open",
  "playersOnline": 5,
  "uptime": 3600000,
  "activeMonsters": 42,
  "worldTime": "10:30"
}
```

### Response Fields

- **status** (`string`): Server status. Possible values:
  - `"open"` - Server is running and accepting connections
  - `"opening"` - Server is starting up
  - `"closing"` - Server is shutting down
  - `"closed"` - Server is not running
- **playersOnline** (`number`): Number of players currently connected
- **uptime** (`number | null`): Server uptime in milliseconds (null if not initialized)
- **activeMonsters** (`number`): Number of active monsters in the world
- **worldTime** (`string`): Current in-game time (HH:MM format)

## CORS

The endpoint includes CORS headers, so it can be called from any frontend domain.

## Frontend Usage Examples

### JavaScript (Fetch API)

```javascript
async function getServerStatus() {
  try {
    const response = await fetch('http://your-server:port/api/status');
    const data = await response.json();
    
    console.log(`Server Status: ${data.status}`);
    console.log(`Players Online: ${data.playersOnline}`);
    console.log(`Uptime: ${Math.floor(data.uptime / 1000 / 60)} minutes`);
    
    return data;
  } catch (error) {
    console.error('Failed to fetch server status:', error);
    return null;
  }
}

// Poll every 5 seconds
setInterval(getServerStatus, 5000);
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function ServerStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://your-server:port/api/status');
        const data = await response.json();
        setStatus(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch server status:', error);
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!status) return <div>Server unavailable</div>;

  return (
    <div>
      <h2>Server Status</h2>
      <p>Status: <strong>{status.status}</strong></p>
      <p>Players Online: <strong>{status.playersOnline}</strong></p>
      <p>Uptime: <strong>{Math.floor(status.uptime / 1000 / 60)} minutes</strong></p>
      <p>World Time: <strong>{status.worldTime}</strong></p>
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div>
    <h2>Server Status</h2>
    <div v-if="loading">Loading...</div>
    <div v-else-if="status">
      <p>Status: <strong>{{ status.status }}</strong></p>
      <p>Players Online: <strong>{{ status.playersOnline }}</strong></p>
      <p>Uptime: <strong>{{ formatUptime(status.uptime) }}</strong></p>
      <p>World Time: <strong>{{ status.worldTime }}</strong></p>
    </div>
    <div v-else>Server unavailable</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      status: null,
      loading: true,
      interval: null
    };
  },
  mounted() {
    this.fetchStatus();
    this.interval = setInterval(this.fetchStatus, 5000);
  },
  beforeUnmount() {
    if (this.interval) clearInterval(this.interval);
  },
  methods: {
    async fetchStatus() {
      try {
        const response = await fetch('http://your-server:port/api/status');
        const data = await response.json();
        this.status = data;
        this.loading = false;
      } catch (error) {
        console.error('Failed to fetch server status:', error);
        this.loading = false;
      }
    },
    formatUptime(ms) {
      if (!ms) return 'N/A';
      return `${Math.floor(ms / 1000 / 60)} minutes`;
    }
  }
};
</script>
```

### HTML Example (No Framework)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Server Status</title>
  <style>
    .status-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    .status-item {
      margin: 10px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
    }
    .status-open { background-color: #4CAF50; color: white; }
    .status-closing { background-color: #FF9800; color: white; }
    .status-closed { background-color: #f44336; color: white; }
  </style>
</head>
<body>
  <div class="status-container">
    <h2>Server Status</h2>
    <div id="status-content">Loading...</div>
  </div>

  <script>
    const SERVER_URL = 'http://your-server:port/api/status';

    async function updateStatus() {
      try {
        const response = await fetch(SERVER_URL);
        const data = await response.json();
        
        const content = document.getElementById('status-content');
        content.innerHTML = `
          <div class="status-item">
            Status: <span class="status-badge status-${data.status}">${data.status.toUpperCase()}</span>
          </div>
          <div class="status-item">
            Players Online: <strong>${data.playersOnline}</strong>
          </div>
          <div class="status-item">
            Uptime: <strong>${formatUptime(data.uptime)}</strong>
          </div>
          <div class="status-item">
            World Time: <strong>${data.worldTime}</strong>
          </div>
          <div class="status-item">
            Active Monsters: <strong>${data.activeMonsters}</strong>
          </div>
        `;
      } catch (error) {
        document.getElementById('status-content').innerHTML = 
          '<div style="color: red;">Failed to fetch server status</div>';
      }
    }

    function formatUptime(ms) {
      if (!ms) return 'N/A';
      const minutes = Math.floor(ms / 1000 / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    }

    // Update immediately and then every 5 seconds
    updateStatus();
    setInterval(updateStatus, 5000);
  </script>
</body>
</html>
```

## Error Responses

### 405 Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Notes

- The endpoint is read-only and does not require authentication
- Response times are typically very fast (< 10ms)
- Recommended polling interval: 5-10 seconds for real-time updates
- The endpoint is safe to call frequently as it only reads in-memory data
