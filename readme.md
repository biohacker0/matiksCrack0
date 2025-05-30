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
Tool that auto finds a matiks.in game, joins it, auto decrypts the questions, and burst solves them.

> Why? Ehh, I was bored, script kiddie be script kidding something something.
> Enjoy before it gets fixed.

- Connects to Matiks server via WebSocket
- Automatically finds and joins available games or join particular game
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

**Option 1**: Decode JWT Token

1. Copy the JWT token (the part after `token=` in the URI)
2. Visit [jwt.io](https://jwt.io) or [FusionAuth JWT Decoder](https://fusionauth.io/dev-tools/jwt-decoder)
3. Paste the token into the "Encoded" section
4. In the "Decoded" payload, look for an `id` field (e.g., `"id": "6816deda11e2a69441abc5d4"`)

**Option 2**: Network Requests

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

The script supports two modes via CLI flags:

### Mode 1: Autoplay (Discover and Analyze a Game)

Explores game mechanics by automatically discovering a game.

```bash
npm start -- --autoplay
```

- This mode runs the full exploration: finds a game, processes data, and outputs a result URL.
- Use this to study Matiks' API interactions from start to finish.

### Mode 2: Analyze a Specific Game

Explores a specific game using the full game URL (e.g., from the Matiks GUI or a previous --autoplay run).

```bash
npm start -- --game https://www.matiks.com/game/6848danc01q2a69543abq5d4/play
```

- Provide the full URL as shown, including https://www.matiks.com/game/<gameId>/play.
- The <gameId> must be a 24-character hexadecimal string.
- Use this to analyze a game you've started via the Matiks website or from an --autoplay output.

Note: The -- after npm start ensures CLI flags are passed to the script, not npm.

## Disclaimer

- for educational and security testing purposes only. use responsibly in compliance with matiks’ terms of service to learn about api interactions and promote secure system design.

- The author(s) assume no liability and are not responsible for any misuse or damage caused by this program. Users are solely responsible for ensuring their use complies with all applicable laws and regulations.
