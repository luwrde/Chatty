# Chat app

React/Vite frontend with a Node.js/Express backend. Accounts and messages are stored in MongoDB. XAMPP/MySQL is used by the ecommerce integration; it does not store chat accounts.

## Local setup

Run these commands from the project root. On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```powershell
npm.cmd install --prefix backend
npm.cmd install --prefix frontend
```

Configure [backend/.env](backend/.env) with your own values:

```dotenv
PORT=5001
NODE_ENV=development
MONGODB_URI=<your MongoDB connection string>
JWT_SECRET=<a long random secret>
GROQ_API_KEY=<your Groq API key>
CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
CLOUDINARY_API_KEY=<your Cloudinary API key>
CLOUDINARY_API_SECRET=<your Cloudinary API secret>
```

The backend currently initializes the Groq client at startup, so its API key is required. Cloudinary credentials are needed for image uploads. Keep this file private; it is ignored by Git.

Start the backend and leave its terminal running:

```powershell
npm.cmd run start --prefix backend
```

Wait for `MongoDB connected` and `server is running on PORT: 5001`. The backend exits if the initial database connection fails, rather than accepting requests that cannot access accounts. Restart it after changing the environment file.

In a second terminal, start the frontend:

```powershell
npm.cmd run dev --prefix frontend
```

Open http://localhost:5173. The frontend expects the API at http://localhost:5001/api, and the backend permits the frontend's port 5173.

## Store connection

The Store and Orders pages, the sign-in and sign-up pages, the admin console and the assistant read the EcommerSense PHP store under XAMPP:

- **Products:** `http://localhost/ecommerce/get-products-for-bot.php`, so Apache must be serving the store.
- **Orders, sellers in a buyer's chat list, Free Shipping badges:** the MySQL database `ecommerse_db` on localhost (user `root`, no password). A chat account is matched to a store account by email.
- **Store policies** (Help Center and the assistant) are kept in MongoDB. On first use they're filled in from the assistant's earlier prompt. Admins confirm, edit or add them in the admin console at `/admin`; only confirmed ones reach buyers.

If the store isn't running, the Store and Orders pages say so, the sign-in and sign-up pages show sample products instead, and the chat keeps working.

## Admin accounts

Sign-up only creates buyer accounts. Admins add other admins in the admin console (`/admin`, **Admin accounts** card); the new admin signs in on the regular sign-in page. For the first admin of a new database, sign up normally, then set that user's `role` to `"admin"` in MongoDB.

## Signup troubleshooting

- **Connection refused / Signup failed:** ensure the backend is running on port 5001. Running Vite or XAMPP alone does not start the API.
- **Database startup failed:** check the MongoDB URI, database user credentials, cluster availability, and Atlas network access for your current IP.
- **DNS SRV/TXT timeouts with `mongodb+srv://`:** use the cluster's standard `mongodb://` connection string, including all seed hosts, `tls=true`, and the correct `authSource` and `replicaSet` options. Preserve the database name and existing query options. This avoids SRV/TXT discovery while retaining TLS. Do not simply replace the URI prefix: the host list and options differ. Refresh the seed hosts if the cluster configuration changes.
- **`users.findOne()` buffering timed out:** the API was accepting requests before MongoDB connected. Restart the updated backend and resolve any startup error.
- **Email already exists:** sign in with that email or use another address.

The local connection was verified using a standard TLS URI after DNS TXT queries timed out on this network. No credentials are included in this README.
