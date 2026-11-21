import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// Scripts run from packages/db; load the repo-root env files.
const root = fileURLToPath(new URL('../../../', import.meta.url));
config({ path: [`${root}.env.local`, `${root}.env`], quiet: true });
