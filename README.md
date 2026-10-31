# Midnight Carnival

A pixel carnival murder mystery for up to 35 players plus a crowd of spectators. Guests scan a QR code, draw a character, and play on their phones. The host runs the game from the admin page.

## What is in this folder

| Path | What it does |
| --- | --- |
| `public/index.html` | The page every guest and the host opens |
| `netlify/functions/game.mjs` | The game server: roles, votes, powers, secrets |
| `netlify.toml` | Tells Netlify where the page and server live |
| `package.json` | Lists the one library the server needs (Netlify Blobs) |

## Deploy (no installs needed)

1. **Put the files on GitHub.** Sign in at github.com, create a new repository named `midnight-carnival`, and choose "uploading an existing file." Drag in everything from this folder: `public`, `netlify`, `netlify.toml`, `package.json`, and this README. Commit.
2. **Connect Netlify.** At app.netlify.com, choose **Add new site**, then **Import an existing project**, then **GitHub**, and pick `midnight-carnival`. Leave the build command blank. Netlify reads the rest from `netlify.toml`. Click **Deploy**.
3. **Set your PIN.** In the site's **Site configuration**, open **Environment variables** and add `ADMIN_PIN` with a PIN of your choosing (keep it out of the repo). Then open **Deploys** and choose **Trigger deploy** so the server picks it up. The host page stays locked until this is set.
4. **Open the host page.** Go to `https://YOUR-SITE.netlify.app/#admin` and enter the PIN.

Netlify Blobs, where the game is saved, turns on automatically. There is nothing else to configure.

## Running the night

1. On the admin page, pick the killer count, cast size, and special roles, then tap **Open the lobby**.
2. Show the QR code from the admin page. Guests scan it, type their real name, and draw a ticket.
3. When everyone is in, tap **Deal roles and start**.
4. Each round: start the timer, let people mingle, tap **Open the vote**, then **Close the vote and reveal**.
5. When the game ends, tap **End game** to go back to setup for another round.

**If a guest loses their character** (new browser, cleared history), find their name in the admin table, read them the 4-letter **Code**, and have them tap **Lost your ticket?** on the join screen.

**Guests who arrive after the deal** join as spectators and vote with the crowd.

