# Azembay RIPT 1 — Plateforme Vente Privée Off-Market

Application web complète de gestion de la vente privée du projet immobilier **Azembay RIPT 1**, Sidi Bou Naim, Maroc.

---

## Stack technique

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + composants UI personnalisés
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Resend** pour les emails automatiques
- **@react-pdf/renderer** pour les vouchers PDF
- **Vercel** pour le déploiement

---

## Déploiement en 5 étapes

### Étape 1 — Configurer Supabase

1. Aller dans **Supabase Dashboard → SQL Editor**
2. Exécuter le contenu de `supabase/schema.sql` (tables, RLS, données initiales)
3. Aller dans **Storage → New bucket** :
   - Nom : `documents`
   - Public : **OFF** (privé)
4. Créer les 4 utilisateurs test via **Authentication → Users → Add user** :
   ```
   direction@azembay.ma  / Direction2026!
   manager@azembay.ma    / Manager2026!
   apporteur@azembay.ma  / Apporteur2026!
   securite@azembay.ma   / Securite2026!
   ```

### Étape 2 — Variables d'environnement sur Vercel

Dans **Vercel → Project → Settings → Environment Variables** :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bzfthzrbahfgbxkmymdn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | votre anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | votre service role key |
| `RESEND_API_KEY` | votre Resend API key |
| `NEXT_PUBLIC_APP_URL` | `https://azembay-vp.vercel.app` |

### Étape 3 — Connecter GitHub à Vercel

1. Dans Vercel → New Project → Import `benamoury/azembay-vp`
2. Branch : `claude/azembay-real-estate-app-bHRIy`
3. Framework : **Next.js** (auto-détecté)
4. Cliquer **Deploy**

### Étape 4 — Configurer Resend

1. Dans Resend Dashboard, vérifier votre domaine
2. Mettre à jour `FROM` dans `lib/email/resend.ts`

### Étape 5 — Vérifier

1. Ouvrir l'URL Vercel
2. Se connecter avec `direction@azembay.ma` / `Direction2026!`
3. Vérifier le tableau de bord

---

## Profils utilisateurs

| Rôle | Accès |
|---|---|
| `direction` | Accès total |
| `manager` | CRM, vouchers, documents, liens, séjours |
| `apporteur` | Ses prospects, soumission, calendrier |
| `securite` | Guest list du jour uniquement |

---

*CONFIDENTIEL — Azembay RIPT 1 — Sidi Bou Naim, Maroc*