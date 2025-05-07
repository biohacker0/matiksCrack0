```
_____________________________________________________________________________
|                                                                             |
|      ███╗   ███╗ █████╗ ████████╗██╗██╗  ██╗███████╗ ██████╗               |
|      ████╗ ████║██╔══██╗╚══██╔══╝██║██║ ██╔╝██╔════╝██╔═══██╗              |
|      ██╔████╔██║███████║   ██║   ██║█████╔╝ ███████╗██║   ██║              |
|      ██║╚██╔╝██║██╔══██║   ██║   ██║██╔═██╗ ╚════██║██║   ██║              |
|      ██║ ╚═╝ ██║██║  ██║   ██║   ██║██║  ██╗███████║╚██████╔╝              |
|      ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝      ██████╗  |
|                                                                             |
|_____________________________________________________________________________|




>> what dis
Tool that auto finds a Matiks game, joins it, auto decrypts the questions, and burst solves them.

> Why? Ehh, I was bored, script kiddie be script kidding something something.
> Enjoy before it gets fixed.

- Connects to Matiks server via WebSocket
- Automatically finds and joins available games
- Decrypts questions in real-time
- Solves problems before others can

```

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/biohacker0/matiksCrack0.git
   cd matiksCrack0
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

   This installs the required packages (axios, ws, dotenv) as specified in package.json.

3. **Set Up Environment Variables**:
   Create a `.env` file if not exist , in the project root directory with the following content:
   ```
   URI=wss://server.matiks.com/ws?token=<YOUR_JWT_TOKEN>
   USER_ID=<YOUR_USER_ID>
   ```
   Replace `<YOUR_JWT_TOKEN>` and `<YOUR_USER_ID>` with your actual values (see Obtaining Credentials below).

## Obtaining Credentials

To run the script, you need two pieces of information: the WebSocket URI (including a JWT token) and your USER_ID.

### Method 1: Browser Developer Tools

#### Step 1: Get the WebSocket URI

1. Open your browser and log in to matiks.com.
2. Open Developer Tools:
   - Chrome: Press F12 or Ctrl+Shift+I, then go to the Network tab
   - Firefox: Press F12, then go to the Network tab
3. Filter for WebSocket connections by typing `ws` in the filter bar
4. Perform an action on the Matiks website (e.g., start a game or refresh the page)
5. Look for a WebSocket connection with a URL like:
   ```
   wss://server.matiks.com/ws?token=<long_jwt_token>
   ```
6. Copy the full URL (including the token parameter) and paste it into the URI field in your .env file

#### Step 2: Get Your USER_ID

**Option 1**: From Game URL

- Play any game on Matiks
- The URL will look like: `https://www.matiks.com/game/681ab0453cdv909fb054d570/play`
- The part `681ab0453cdv909fb054d570` is your user ID - copy it

**Option 2**: Decode JWT Token

1. Copy the JWT token (the part after `token=` in the URI)
2. Visit [jwt.io](https://jwt.io)
3. Paste the token into the "Encoded" section
4. In the "Decoded" payload, look for an `id` field (e.g., `"id": "6816deda11e2a69441abc5d4"`)

**Option 3**: Network Requests

1. Check the browser's Network tab
2. Look for HTTP requests (e.g., to `https://server.matiks.com/api`) after logging in
3. Inspect the request headers or response data for a user ID (often labeled `id` or `userId`)

### Example .env File:

```
URI=wss://server.matiks.com/ws?token=eyJhnGeiOiJIbzI1NuIsInR5cCI6IkpXVCJ9...
USER_ID=6817dfdn13a2a42441abc0e1
```

## Running the Script

1. **Ensure the .env File is Configured**:
   Verify that `URI` and `USER_ID` are correctly set in the .env file.

2. **Start the Script**:
   ```bash
   npm start
   ```
