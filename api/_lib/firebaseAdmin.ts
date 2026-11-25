import fs from 'node:fs';
import path from 'node:path';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

interface AppletConfigFile {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function carregarAppletConfig(): AppletConfigFile {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as AppletConfigFile;
    }
  } catch {
    // Ignora falha de leitura caso esteja na Vercel usando apenas variáveis de ambiente
  }
  return {};
}

function obterAppAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const appletConfig = carregarAppletConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || appletConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      projectId,
    });
  }

  if (projectId) {
    // Em ambiente AI Studio (projeto próprio), utiliza Application Default Credentials
    return initializeApp({ projectId });
  }

  return initializeApp();
}

export function getAdminFirestore(): Firestore {
  const app = obterAppAdmin();
  const appletConfig = carregarAppletConfig();
  const databaseId =
    process.env.FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || '(default)';

  if (databaseId && databaseId !== '(default)') {
    return getFirestore(app, databaseId);
  }
  return getFirestore(app);
}

export function getAdminAuth(): Auth {
  const app = obterAppAdmin();
  return getAuth(app);
}
