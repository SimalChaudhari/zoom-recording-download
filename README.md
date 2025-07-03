# Zoom Recording Download Automation

This project is designed to automatically download Zoom meeting recordings.

## Multi-Tenant Support

### Overview
The system now supports multiple Zoom tenant accounts. This allows you to:
- Switch between different Zoom tenants
- Use different API credentials for each tenant
- Configure different allowed hosts for each tenant
- Handle tenant migrations seamlessly

### Configuration

#### Environment Variables
Create a `.env` file based on `env.example`:

```bash
# Active Tenant Selection
USE_OLD_TENANT=false
USE_NEW_TENANT=true

# Old Tenant Configuration
ZOOM_CLIENT_ID_OLD=your_old_client_id
ZOOM_CLIENT_SECRET_OLD=your_old_client_secret
ZOOM_ACCOUNT_ID_OLD=your_old_account_id

# New Tenant Configuration
ZOOM_CLIENT_ID_NEW=your_new_client_id
ZOOM_CLIENT_SECRET_NEW=your_new_client_secret
ZOOM_ACCOUNT_ID_NEW=your_new_account_id
```

#### Tenant Management
- **Old Tenant**: Current tenant with existing recordings
- **New Tenant**: Merged tenant with both old and new users
- Only one tenant can be active at a time
- Switch tenants using API endpoints or environment variables

## New Feature: Host Filtering

### Overview
After merging into the new Zoom Tenant, the system will now only download recordings from specific hosts. This ensures that only authorized hosts' recordings are processed.

### Configuration

#### Allowed Hosts List
The list of allowed hosts is maintained in the `src/config/allowedHosts.js` file:

```javascript
const allowedHosts = [
  'iscacpd*@isca.org.sg',  // Wildcard pattern for all iscacpd accounts
  // Add more specific hosts or wildcard patterns here
  // 'specific.user@isca.org.sg',
  // 'another.pattern*@isca.org.sg',
];
```

**Wildcard Support:**
- `*` - Matches any sequence of characters
- `?` - Matches any single character
- Examples:
  - `iscacpd*@isca.org.sg` - Matches all iscacpd accounts
  - `user*@domain.com` - Matches all users with prefix "user"
  - `test?@example.com` - Matches test1@example.com, test2@example.com, etc.

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

#### New Endpoints
- `GET /allowed-hosts` - Returns the list of allowed hosts
- `GET /test-host?email=user@example.com` - Test if an email matches any allowed pattern
- `GET /tenants` - Returns all configured tenants and active tenant
- `POST /switch-tenant` - Switch to a different tenant

### Usage Examples

#### To view the list of allowed hosts:
```bash
curl http://localhost:3000/allowed-hosts
```

Response:
```json
{
  "message": "Allowed hosts retrieved successfully",
  "allowedHosts": ["iscacpd*@isca.org.sg"],
  "count": 1
}
```

#### To test if an email matches any pattern:
```bash
curl "http://localhost:3000/zoom/test-host?email=iscacpd5@isca.org.sg"
```

Response:
```json
{
  "message": "Pattern test completed",
  "email": "iscacpd5@isca.org.sg",
  "isAllowed": true,
  "matchingPatterns": ["iscacpd*@isca.org.sg"],
  "allPatterns": ["iscacpd*@isca.org.sg"]
}
```

#### To view all tenants:
```bash
curl http://localhost:3000/zoom/tenants
```

Response:
```json
{
  "message": "Tenants retrieved successfully",
  "tenants": [
    {
      "key": "old",
      "name": "Old Tenant (Current)",
      "isActive": false,
      "accountId": "GrjrYUJ0R72wxMZUoDmgpg"
    },
    {
      "key": "new",
      "name": "New Tenant (Merged)",
      "isActive": true,
      "accountId": "your_new_account_id"
    }
  ],
  "activeTenant": {
    "key": "new",
    "name": "New Tenant (Merged)"
  }
}
```

#### To switch to a different tenant:
```bash
curl -X POST http://localhost:3000/zoom/switch-tenant \
  -H "Content-Type: application/json" \
  -d '{"tenantKey": "old"}'
```

Response:
```json
{
  "message": "Tenant switched successfully",
  "activeTenant": "old"
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
