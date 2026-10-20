# Video map — 2026-10-20

Every public video on **@HarmonizedBrainCentersTN** (channel `UCJlknVF2RyQwYu8RM_1cAcA`), where the old WordPress site embedded it, and where it lives on the new site.

**Sources.** The inventory comes from the channel's own public pages: the /videos grid (15), the /shorts grid (2) and the RSS feed. The channel header says "17 videos", so those three agree. Duration and upload date come from each video's own watch page (`videoDetails.lengthSeconds`, `microformat.uploadDate`). No API key was used. Old-site embeds were read with plain GETs to SiteGround (35.212.22.77, `Host: harmonizedbraincenterstn.com`), covering all 101 legacy URLs in `scripts/check-redirects.mjs` plus the 45 other URLs in the old sitemaps. Only the 101 had any embeds.

**Duration.** The figure is `lengthSeconds`, the length of the file itself. YouTube's schema markup and Studio round up, so on 8 of the 16 videos they show one second more. That is the same call Ben made for FCUyUqzE3Dk on 2026-10-13: 48 s, not 49.

**Old page.** This column shows what each WordPress URL served at the time of the fetch, and the "→" shows where the redirect map sends it today. Aliases that WordPress itself redirected (`/stress/` → `/stressanxiety/`, and so on) are listed with the page they landed on.

| # | Video (YouTube title, verbatim) | id | Duration | Published | Old page(s) it was on | New home: watch page + content page | Story |
|---|---|---|---|---|---|---|---|
| 1 | How Neurofeedback Helps Reset the Brain | `THKM7Euo9Uo` | 5:15 | 2026-03-16 | none | `/videos/how-neurofeedback-helps-reset-the-brain` + `/how-lens-works` | no |
| 2 | What Is Low Energy Neurofeedback — And How Is It Different? | `YX4yNxhdnUM` | 4:38 | 2026-03-13 | none | `/videos/what-is-low-energy-neurofeedback` + `/lens-neurofeedback` | no |
| 3 | When the Brain Feels Out of Balance | `CnQgJRqFDEo` | 4:44 | 2026-03-11 | none | `/videos/when-the-brain-feels-out-of-balance` + `/concerns/emotional-regulation` | no |
| 4 | Understanding the ADHD Brain | `9_3_EByrX6A` | 5:09 | 2026-03-11 | none | `/videos/understanding-the-adhd-brain` + `/children-families` | no |
| 5 | Ellie Holcomb’s Brain Fog… GONE?! 🤯 \| Her HBC Breakthrough *(Short)* | `iTLXETj8htk` | 2:15 | 2025-12-02 | `/home` → `/` | `/videos/ellie-holcomb-brain-fog` + `/concerns/brain-fog` | **yes** ⚑ |
| 6 | LENS Neurofeedback: How Long Until You Feel a Difference? | `9vcfvxKd19I` | 1:43 | 2025-05-15 | none | `/videos/how-long-until-you-feel-a-difference` + `/faq` | no |
| 7 | Can LENS Neurofeedback Help You Sleep Better? \| Real Results Explained | `xtx4g3tbtd4` | 1:08 | 2025-05-14 | `/sleepproblems` (+ `/sleep-disorder`) → `/concerns/sleep` | `/videos/can-lens-help-you-sleep-better` + `/concerns/sleep` | no |
| 8 | Your First Appointment at Harmonized Brain Centers: What to Expect | `FCUyUqzE3Dk` | 0:48 | 2025-04-30 | none | `/videos/your-first-appointment` + `/first-visit` (and `/contact`, unchanged) | no |
| 9 | Life-Changing Transformation: How LENS Neurofeedback Helped Me Ditch Antidepressants After 20 Years | `AmvsepFDmqY` | 1:35 | 2025-03-31 | `/home` → `/`; `/testimonials` → `/stories`; `/faq` (+ `/faqs`) → `/faq`; `/refer-a-friend` → `/contact` | `/videos/off-antidepressants-after-20-years` + `/resources/lens-and-medication` | **yes** ⚑ |
| 10 | From Concussion Fog to Crystal Clarity: Rachel's LENS Story | `sy1c02U2z5Y` | 3:31 | 2025-03-20 | `/concussion-and-tbi` (+ `/concussion-tbi1`) → `/concerns/concussion`; `/testimonials` → `/stories` | `/videos/rachels-concussion-story` + `/concerns/concussion` | **yes** |
| 11 | From Depression & Memory Loss to Joy: Ann's LENS Journey | `0UCoTkcBaIE` | 1:57 | 2025-03-20 | `/home` → `/`; `/stressanxiety` (+ `/stress`) → `/concerns/anxiety`, `/concerns/stress-resilience`; `/depression` (+ `/depression1`) → `/concerns/depression`; `/testimonials` → `/stories`; `/refer-a-friend` → `/contact` | `/videos/anns-story` + `/concerns/depression` | **yes** ⚑ |
| 12 | Discovering Hope in the Midst of Debilitating Anxiety | `IRouWa7dLfE` | 1:20 | 2025-03-20 | `/testimonials` → `/stories` | `/videos/hope-in-the-midst-of-anxiety` + `/concerns/anxiety` | **yes** |
| 13 | How She Overcame 32 Surgeries to Dominate Real Estate with LENS | `fEEIHDzeMEw` | 3:00 | 2025-03-20 | `/testimonials` → `/stories` | `/videos/after-32-surgeries` + `/concerns/performance` | **yes** |
| 14 | Relief from ADD + ADHD | `Ky6CMY3L9ek` | 1:33 | 2025-03-18 | `/add-adhd`, `/add-adhd-landing-page` → `/concerns/focus-adhd` | `/videos/relief-from-add-adhd` + `/concerns/focus-adhd` | no |
| 15 | How LENS Helps with Stress & Anxiety | `qbl_MpWq1LA` | 1:55 | 2025-03-18 | none | `/videos/how-lens-helps-with-stress-and-anxiety` + `/concerns/stress-resilience` | no |
| 16 | Find Yourself Again with LENS at Harmonized Brain Centers | `6Pm8eiJR38A` | 2:18 | 2025-02-21 | `/home` → `/`; `/what-is-lens` (+ `/lens-therapy`) → `/lens-neurofeedback`; `/nashville_neurofeedback_therapy` → `/locations/nashville`; `/emotional-balance` (+ `22`) → `/concerns/emotional-regulation`; `/depression` → `/concerns/depression`; `/peakperformance` (+ `/self-development`) → `/concerns/performance`; `/migrainesandpain` (+ `/migraines-and-fibromyalgia`) → `/concerns/migraines`; `/refer-a-friend` → `/contact` | `/videos/find-yourself-again` + `/locations/nashville` | no |
| — | Trisha Yearwood: Harmonized Brain Centers and LENS Therapy Changed My Life Shares *(Short)* | `fhmoa68_uHY` | 1:47 | 2025-07-17 | none | **Skipped**: already featured on the homepage (Trisha band). That section was left as it is. | — |

Each content page carries at most one video. Where an old page held several, the new page gets the one that fits its subject best, and every video still gets its own watch page.

## Redirects

Every old URL that embedded a video already 301s to a related page, and none of them 410s, so **no redirect was changed.** Reading each one:

- Concern pages, `/what-is-lens`, `/nashville_…` and `/faq` all land on the new page for the same subject.
- `/testimonials` → `/stories` lands on the client-stories page, which now links to the video stories.
- `/trisha-yearwood` → `/stories`: see the flag below.
- `/refer-a-friend` → `/contact`: the referral page's job was "get in touch", and `/contact` is that page.
- `/home` → `/`: the homepage.

## Flagged

1. **Off-channel embeds the old site carried, not built.**
   - `/adhd` embedded `tqOTtjrz2Lo` ("Cynthia Ware | Harmonized Brain Centers", 1:41). It belongs to a second HBC channel, also named "Harmonized Brain Centers" (`UCYeg9pIXVbN-COuhpjGw3rQ`). That channel goes back to 2013; its feed alone lists 15 videos, including "Trisha Yearwood and LENS Neurofeedback" and "Explaining LENS". The brief named only @HarmonizedBrainCentersTN, so none of those were built. Say the word and that channel can get the same treatment.
   - `/trisha-yearwood` embedded `73QDLSgzKAA`, Trisha's full Bobby Bones interview (1 h). That video is on the Bobby Bones channel, not ours. The page still redirects to `/stories`.
2. **Ellie Holcomb (#5)** is a recognizable artist, in the same position as Trisha. Trisha's homepage band carries a `[Confirm approval: name · likeness …]` tag; Ellie's video is published on HBC's own channel and the brief says there are no confirm gates, so it was built without one. It is a Short (vertical), so the 16:9 player shows it pillarboxed. Its YouTube thumbnail, which is now the committed poster, has burned-in text: "LENS neurofeedback healed her tinnitus & post-COVID brain fog". That is a stronger claim than anything in the site's copy. The site's description says only "brain fog". To remove the claim, either change the thumbnail in Studio and re-run `npm run fetch:posters -- --force`, or drop the record.
3. **#9's title says "Ditch Antidepressants".** The site's own rule is "we never advise on medication". The site label drops YouTube's "Life-Changing Transformation:" prefix. The watch page and the `/resources/lens-and-medication` embed both carry the site's standard prescriber line under the video. `sourceTitle` and the schema keep YouTube's title verbatim.
4. **#11 on `/concerns/depression`.** This is a medical-first page with 988 above the headline. Ann's story sits below the fold, after the body copy and the limit line. The old `/depression` page carried the same video.
5. **Site labels differ from the YouTube title on four videos.** The YouTube title stays verbatim as `sourceTitle`, the schema `name` and the iframe title. Only the page H1 and caption differ:
   - #5: "Ellie Holcomb on Brain Fog and LENS" (drops the emoji and the "GONE?!").
   - #7: "Can LENS Neurofeedback Help You Sleep Better?" (drops "\| Real Results Explained").
   - #8: keeps Ben's existing label, "What to Expect: Appointment #1".
   - #9: drops the "Life-Changing Transformation:" prefix.
6. **Story flag for #13 and #14.** #13, "32 surgeries", is a client interview, so it is marked `story`. #14, "Relief from ADD + ADHD", is narrated as an explainer ("we dive into…"), so it is not.
7. **Search Console's ~41.** The old site had embeds on 17 distinct pages: 27 page-and-video pairs. Counting the WordPress aliases as separate URLs, that becomes 27 URLs and 42 pairs, which is the nearest match to Google's ~41. How Google counted is a guess. The new site has 16 watch pages, one per video, each with the video as its main content. Those are the pages that can earn a video listing now.
8. **The four Hopeful Brain episodes share one poster**, the series artwork, as published on YouTube. Only their titles tell them apart on the hub.
9. **/contact no longer carries a VideoObject.** Its video appears only after the form is submitted, so a crawler never sees it there. `/videos/your-first-appointment` is now the one URL with that video's markup. The video on /contact is unchanged.
10. **VideoObject only on watch pages.** The content-page embeds carry no markup of their own, so each video has one canonical URL for Google to list it under.
