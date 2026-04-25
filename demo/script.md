# Viaticum — 3-Minute Demo Script

Practice this 3× before presenting. Time each run.

---

## Setup (before going on stage)
- [ ] Backend running: `curl localhost:8000/health` returns `{"status":"ok",...}`
- [ ] Frontend running: http://localhost:8501 loads
- [ ] Backup video ready: `demo/backup_demo.mp4`
- [ ] Sample audio files in `data/sample_conversations/`

---

## [00:00] Login
Open http://localhost:8501 (or Cloud Run URL).  
Login: **dr.weber / viaticum2026**  
Say: *"Viaticum — non-invasive AI scribe for German hospitals."*

## [00:15] Patientenorganizer
Click **Patientenorganizer** in the sidebar.  
Say: *"This is the Patientenorganizer — the standard German hospital patient list. We mimic the exact layout clinicians use every day."*  
Click row for **Schneider, Maria, 78J**.

## [00:30] OMNI proactive prefill
OMNI sidebar shows: *"Ich habe einen Entwurf vorbereitet."*  
Say: *"OMNI detected this patient had a consultation earlier. It drafted the SOAP note automatically — no button pressed."*  
Click **Anzeigen**.

## [00:45] Verlaufseintrag pre-fill
Switch to **Verlaufseintrag** tab.  
Click **Einfügen** — SOAP text appears in the form field.  
Say: *"One click. The AI fills the legacy KIS form. No API integration required. No hospital IT project. Deployment in days."*

## [01:10] Live Consultation
Click **Live-Konsultation** in the sidebar.  
Select **Beispiel 1** from the sample dropdown (or upload your .wav).  
Click **Transkribieren**.  
Say: *"This is audio from the Omi wearable — streaming directly to our on-premise backend over WebSocket."*

## [01:30] Segments appear
Point to the speaker bubbles.  
Say: *"Arzt on the right, Patient on the left. Our fine-tuned Parakeet-DE-Med model achieves 3.28% WER on German medical speech."*

## [01:45] SOAP creation
Click **SOAP-Notiz erstellen**.  
Say: *"Our fine-tuned Pioneer Gemma-3-4B structures the transcript into a formal Arztbrief SOAP note in under 2 seconds."*  
Point to the 4 cards: Subjektiv, Objektiv, Beurteilung, Plan.

## [02:05] Entity chips
Point to the colored chips below the SOAP cards.  
Say: *"GLiNER2 extracted Ramipril, 5mg dosage, Brustschmerzen as symptom, 160/95 as vital sign — with confidence scores. This feeds the ICD code suggestions."*

## [02:20] KIS typewriter
Click **In Verlaufseintrag einfügen**.  
Watch the typewriter animation.  
Say: *"And this simulates the computer-vision keystroke injection into the legacy KIS. The system types the note for the doctor. No API. No integration project."*

## [02:35] OMNI chat
In the OMNI sidebar, type: **Was hat die Patientin über ihre Schmerzen gesagt?**  
Say: *"The doctor can ask questions in natural German. OMNI retrieves the exact segment with timestamp from today's conversations."*

## [02:55] Pitch close
Say: *"Non-invasive, on-premise, GDPR-compliant. 44% of physician time back. Built for German hospitals from the ground up."*  
Switch to slides for the eval table.

---

## If the demo crashes
Play `demo/backup_demo.mp4`.  
Say: *"Let me show you the recorded version while we sort that out."*
