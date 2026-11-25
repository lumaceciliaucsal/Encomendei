import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { ArtesaoDoc, PerfilPublicoDoc } from '../lib/tipos';

interface AuthContextValue {
  user: User | null;
  authPronto: boolean;
  carregandoDados: boolean;
  artesao: ArtesaoDoc | null;
  perfilPublico: PerfilPublicoDoc | null;
  entrarComEmail: (email: string, senha: string) => Promise<void>;
  cadastrarComEmail: (nome: string, email: string, senha: string) => Promise<void>;
  entrarComGoogle: () => Promise<void>;
  enviarRecuperacaoSenha: (email: string) => Promise<void>;
  reenviarVerificacao: () => Promise<void>;
  recarregarUsuario: () => Promise<boolean>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authPronto, setAuthPronto] = useState(false);
  const [artesao, setArtesao] = useState<ArtesaoDoc | null>(null);
  const [perfilPublico, setPerfilPublico] = useState<PerfilPublicoDoc | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthPronto(true);
      if (!currentUser) {
        setArtesao(null);
        setPerfilPublico(null);
        setCarregandoDados(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authPronto || !user) return;
    setCarregandoDados(true);

    const artesaoPath = `artesaos/${user.uid}`;
    const perfilPath = `perfisPublicos/${user.uid}`;
    let loadedArtesao = false;
    let loadedPerfil = false;

    const finalizarSePronto = () => {
      if (loadedArtesao && loadedPerfil) {
        setCarregandoDados(false);
      }
    };

    const unsubArtesao = onSnapshot(
      doc(db, 'artesaos', user.uid),
      (snap) => {
        setArtesao(snap.exists() ? (snap.data() as ArtesaoDoc) : null);
        loadedArtesao = true;
        finalizarSePronto();
      },
      (error) => {
        loadedArtesao = true;
        finalizarSePronto();
        handleFirestoreError(error, OperationType.GET, artesaoPath);
      }
    );

    const unsubPerfil = onSnapshot(
      doc(db, 'perfisPublicos', user.uid),
      (snap) => {
        setPerfilPublico(snap.exists() ? (snap.data() as PerfilPublicoDoc) : null);
        loadedPerfil = true;
        finalizarSePronto();
      },
      (error) => {
        loadedPerfil = true;
        finalizarSePronto();
        handleFirestoreError(error, OperationType.GET, perfilPath);
      }
    );

    return () => {
      unsubArtesao();
      unsubPerfil();
    };
  }, [authPronto, user]);

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), senha);
  }, []);

  const cadastrarComEmail = useCallback(async (nome: string, email: string, senha: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
    if (nome.trim()) {
      await updateProfile(cred.user, { displayName: nome.trim() });
    }
    await sendEmailVerification(cred.user);
  }, []);

  const entrarComGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const enviarRecuperacaoSenha = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const reenviarVerificacao = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const recarregarUsuario = useCallback(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser } as User);
    return Boolean(auth.currentUser.emailVerified);
  }, []);

  const sair = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authPronto,
        carregandoDados,
        artesao,
        perfilPublico,
        entrarComEmail,
        cadastrarComEmail,
        entrarComGoogle,
        enviarRecuperacaoSenha,
        reenviarVerificacao,
        recarregarUsuario,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}
