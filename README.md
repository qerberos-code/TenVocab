# VocabSAT v0.2.4

A local-first SAT vocabulary coaching prototype based on the supplied project transcript.

## What is included
- Home dashboard
- 50-word original seed dataset
- 10-word personalized session selection
- Learn cards with definition, example, synonyms, difficulty, and SAT Priority Score
- Vocabulary-in-context multiple choice quiz
- Immediate explanations
- Basic mastery + review scheduling
- Progress screen with accuracy and weakest words
- Local persistence via AsyncStorage

## Run it
1. Install Node.js LTS.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Scan the QR code with Expo Go, or press `w` for web.

## Dependency note
This release is aligned to Expo SDK 54, which is the SDK supported by the Expo Go build currently published on the App Store (54.0.2). Expo Go supports only one SDK at a time, so the project must match it. Expo SDK 54 uses React 19.1.0 and React Native 0.81.5, with React Native Web 0.21.0. React DOM is pinned to 19.1.0 so npm does not select a newer incompatible React DOM release.

If you previously tried to install v0.2, do not reuse its old `node_modules` folder or `package-lock.json`. After replacing the project with v0.2.4, run:

```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

The current Node.js version requirement for Expo SDK 54 is satisfied by Node 24. Node 18 will fail with `configs.toReversed is not a function`.

## Product note
This app does not contain copied College Board questions. The practice questions and explanations here are original prototype content. The SAT Priority Score is an app heuristic, not an official College Board statistic.
