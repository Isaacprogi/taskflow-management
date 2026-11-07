import app from './app.js';
import { env } from './env.js';

// 0.0.0.0 = all network interfaces, so emulators/phones on your LAN can reach it.
app.listen(env.PORT, '0.0.0.0', () => console.log(`API on http://0.0.0.0:${env.PORT}`));
