# Zoom Recording Download Automation

This project is designed to automatically download Zoom meeting recordings.

## New Feature: Host Filtering

### Overview
After merging into the new Zoom Tenant, the system will now only download recordings from specific hosts. This ensures that only authorized hosts' recordings are processed.

### Configuration

#### Allowed Hosts List
The list of allowed hosts is maintained in the `src/config/allowedHosts.js` file:

```javascript
const allowedHosts = [
  'iscacpd5@isca.org.sg',
  // Add more hosts here
];
```

#### To add new hosts:
1. Open the `src/config/allowedHosts.js` file
2. Add the new email to the `allowedHosts` array
3. Restart the server

### API Endpoints

#### Existing Endpoints
- `POST /webhook` - Handles Zoom webhook events
- `GET /download-all` - Downloads all recordings (with date range)
- `GET /download-by-user` - Downloads recordings for a specific user
- `GET /fetch-attendance-report` - Downloads attendance reports

#### New Endpoint
- `GET /allowed-hosts` - Returns the list of allowed hosts

### Usage Examples

#### To view the list of allowed hosts:
```bash
curl http://localhost:3001/allowed-hosts
```

Response:
```json
{
  "message": "Allowed hosts retrieved successfully",
  "allowedHosts": ["iscacpd5@isca.org.sg"],
  "count": 1
}
```

### Logging

The system now provides the following logs:
- How many meetings were fetched
- How many meetings are from allowed hosts
- Which meetings were skipped (due to unauthorized hosts)

### Security

- Only recordings from allowed hosts are downloaded
- Meetings from unauthorized hosts are skipped
- All actions are logged

### Notes

- The system handles the `#` character in host emails
- The system checks both `host_email` and `host_id`
- Server restart is required after changing configuration
