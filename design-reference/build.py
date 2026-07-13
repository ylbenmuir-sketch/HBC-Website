#!/usr/bin/env python3
# Harmonized Brain Centers — static mockup generator (design system v2)
import os
OUT = os.path.dirname(os.path.abspath(__file__))

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">'

LOGO = '''<a class="logo" href="index.html">
  <svg width="42" height="42" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" stroke="#A9853F" stroke-width="1"/><path d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20" stroke="#8FA08D" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
  <div class="logo-name">Harmonized<span>Brain Centers</span></div>
</a>'''

def head(title):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Harmonized Brain Centers</title>
{FONTS}
<link rel="stylesheet" href="css/main.css">
</head>
<body>
'''

def header(active=''):
    def cls(k): return ' active' if k == active else ''
    return f'''<header class="site">
  <div class="nav">
    {LOGO}
    <nav class="nav-links">
      <div>
        <a class="top{cls('help')}" href="what-we-help-with.html">What We Help With</a>
        <div class="mega">
          <div class="col"><h5>Adults</h5>
            <a href="concern-anxiety.html">Anxiety &amp; stress</a>
            <a href="concern-anxiety.html">Focus &amp; ADHD</a>
            <a href="concern-anxiety.html">Sleep</a>
            <a href="concern-anxiety.html">Brain fog &amp; memory</a>
            <a href="concern-anxiety.html">Emotional regulation</a>
            <a href="adults.html">All adult concerns →</a></div>
          <div class="col"><h5>Children &amp; families</h5>
            <a href="concern-anxiety.html">Focus &amp; school difficulties</a>
            <a href="concern-anxiety.html">Emotional regulation</a>
            <a href="concern-anxiety.html">Sleep</a>
            <a href="concern-anxiety.html">Transitions &amp; sensory overwhelm</a>
            <a href="children-families.html">All children's concerns →</a></div>
        </div>
      </div>
      <div><a class="top{cls('lens')}" href="how-lens-works.html">How LENS Works</a></div>
      <div><a class="top{cls('visit')}" href="first-visit.html">Your First Visit</a></div>
      <div><a class="top{cls('about')}" href="about.html">About</a></div>
      <div><a class="top{cls('loc')}" href="locations.html">Locations</a></div>
      <div><a class="top{cls('res')}" href="resources.html">Resources</a></div>
    </nav>
    <a class="nav-tel" href="tel:+16150000000">(615) 000-0000</a>
    <a class="nav-cta" href="contact.html">Talk With Our Team</a>
  </div>
</header>
'''

def final_cta(h='The next step is a conversation, not a commitment.',
              sub='Tell us what\u2019s going on. We\u2019ll listen, answer honestly, and help you decide whether LENS is a fit \u2014 free, and with no obligation.'):
    return f'''<section class="final">
  <div class="wrap rv">
    <div class="eyebrow">Talk with our team</div>
    <h2>{h}</h2>
    <p class="sub">{sub}</p>
    <div class="row">
      <a class="btn btn-invert" href="contact.html">Talk With Our Team</a>
      <div class="tel">or call <b>(615) 000-0000</b></div>
    </div>
    <p class="after">A real person responds within one business day <span style="letter-spacing:.1em">[CONFIRM]</span> &middot; Consultations are free &middot; No referral needed</p>
  </div>
</section>
'''

FOOTER = '''<footer class="site">
  <div class="wrap-wide">
    <div class="foot-grid">
      <div>
        <div class="logo-name" style="color:#FBF8F1">Harmonized<span>Brain Centers</span></div>
        <p style="margin-top:18px;max-width:34ch">Gentle LENS neurofeedback for adults, children, and families across Middle Tennessee.</p>
      </div>
      <div><h5>Help with</h5><a href="what-we-help-with.html">Anxiety &amp; stress</a><a href="what-we-help-with.html">Focus &amp; ADHD</a><a href="what-we-help-with.html">Sleep</a><a href="what-we-help-with.html">Children &amp; school</a><a href="what-we-help-with.html">All concerns</a></div>
      <div><h5>Learn</h5><a href="how-lens-works.html">How LENS works</a><a href="first-visit.html">Your first visit</a><a href="faq.html">FAQ</a><a href="resources.html">Resources</a><a href="stories.html">Client stories</a></div>
      <div><h5>Visit</h5><a href="location-nashville.html">Nashville</a><a href="locations.html">Murfreesboro</a><a href="locations.html">Franklin — coming soon</a><a href="locations.html">All locations</a></div>
      <div><h5>Company</h5><a href="about.html">About</a><a href="founder.html">Our founder</a><a href="team.html">Our team</a><a href="contact.html">Contact</a></div>
    </div>
    <p class="disclaimer">Harmonized Brain Centers is a wellness practice, not a medical clinic. LENS neurofeedback is offered as a wellness service and is not intended to diagnose, treat, cure, or prevent any medical or psychological condition. Information on this site is educational and is not a substitute for advice from a qualified healthcare provider. Individual experiences vary. &copy; 2026 Harmonized Brain Centers &middot; Nashville &middot; Murfreesboro &middot; Franklin (coming soon)</p>
  </div>
</footer>
<script src="js/site.js"></script>
</body>
</html>'''

def ph(img, h, extra='', pos='center'):
    return f'<div class="ph {extra}" style="height:{h}px;background-image:url(img/{img});background-position:{pos}"></div>'

def plate(spec, h, extra=''):
    return f'<div class="plate {extra}" style="height:{h}px"><div class="spec"><b>Photography needed</b>{spec}</div></div>'

def crumb(*parts):
    out = ['<div class="wrap crumb">']
    for i,(label,href) in enumerate(parts):
        if href: out.append(f'<a href="{href}">{label}</a>')
        else: out.append(label)
        if i < len(parts)-1: out.append(' &nbsp;/&nbsp; ')
    out.append('</div>')
    return ''.join(out)

PAGES = {}
def page(fname, title, active, body, cta=True, cta_args=None):
    html = head(title) + header(active) + body
    if cta: html += final_cta(**(cta_args or {}))
    html += FOOTER
    PAGES[fname] = html

# ============================================================ HOMEPAGE
CCARDS = [
 ("Anxiety &amp; nervous-system overload","Adults &amp; children",
  ["Thoughts that won't quiet down","Feeling constantly on edge","Overreacting to small stressors","Unable to relax even when life is calm"]),
 ("Focus, ADHD &amp; follow-through","Adults &amp; children",
  ["Struggling to stay on task","Overwhelmed by multi-step responsibilities","Procrastinating on things you care about","Work or schoolwork that stalls at 90%"]),
 ("Sleep difficulties","Adults &amp; children",
  ["A mind that won't shut off at night","Waking frequently","Eight hours that feel like four","Inconsistent, unpredictable sleep"]),
 ("Emotional regulation","Often children — and their parents",
  ["Becoming overwhelmed quickly","Intense reactions that are hard to stop","Struggling with transitions","Staying upset long after the moment"]),
 ("Brain fog, memory &amp; mental fatigue","Most often adults",
  ["Thinking that feels slow or cloudy","Losing words mid-sentence","Forgetting why you entered the room","Exhausted by normal responsibilities"]),
 ("Stress &amp; resilience","Most often adults",
  ["Functioning, but close to burnout","Unable to recover after hard days","Carrying stress physically","Wanting to handle normal stress normally"]),
]
ccards_html = ''
for t,aud,items in CCARDS:
    lis = ''.join(f'<li>{i}</li>' for i in items)
    ccards_html += f'''<div class="ccard rv"><h3>{t}</h3><div class="aud">{aud}</div><ul>{lis}</ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>\n'''

body = f'''
<section class="hero wrap">
  <div class="hero-grid">
    <div class="rv">
      <div class="eyebrow">LENS Neurofeedback &middot; Adults &amp; Children &middot; Middle Tennessee</div>
      <h1>Feel like <em class="sage">yourself</em> again.</h1>
      <p class="sub">Gentle, noninvasive neurofeedback support for anxiety, focus and ADHD, sleep, emotional regulation, brain fog, and stress &mdash; delivered by trained practitioners at centers across Middle Tennessee.</p>
      <div class="hero-ctas">
        <a class="btn btn-primary" href="contact.html">Talk With Our Team</a>
        <a class="btn btn-ghost" href="how-lens-works.html">See how LENS works <span class="arrow">→</span></a>
      </div>
      <p class="micro">A free, no-pressure conversation. Ask anything &mdash; including the skeptical questions.</p>
    </div>
    <div class="rv">{ph('hero.jpg', 620, 'hero-ph', '46% 24%')}</div>
  </div>
</section>

<div class="proof rv">
  <div class="wrap-wide proof-grid">
    <div><strong>140,000+</strong><span>LENS sessions provided across our centers</span></div>
    <div><strong>3 centers</strong><span>Nashville &middot; Murfreesboro &middot; Franklin (coming soon)</span></div>
    <div><strong>All ages</strong><span>Adults, teens, and children welcomed at every center</span></div>
    <div><strong>Since 2016</strong><span>Serving Middle Tennessee families for nearly a decade</span></div>
  </div>
</div>

<section class="sec-navy celeb-band">
  <div class="wrap celeb-grid">
    <div class="rv">
      <div class="eyebrow" style="color:var(--sage)">In her own words</div>
      <div class="celeb-name">Trisha Yearwood</div>
      <div class="celeb-role">Grammy&reg;-winning artist &middot; on her experience at Harmonized</div>
      <div class="celeb-quote">&ldquo;I feel like I am in my thirties again.&rdquo;</div>
      <div style="margin-top:24px;display:flex;gap:22px;align-items:center;flex-wrap:wrap">
        <a class="btn btn-invert" style="padding:13px 24px;font-size:14.5px" href="https://www.youtube.com/shorts/fhmoa68_uHY" target="_blank" rel="noopener">Watch her story <span class="arrow">→</span></a>
        <span style="color:rgba(251,248,241,.5);font-size:13px;letter-spacing:.06em">Individual experiences vary &middot; <span style="color:var(--gold);letter-spacing:.1em;text-transform:uppercase;font-size:11px">[Confirm approval to feature name &amp; likeness]</span></span>
      </div>
    </div>
    <a class="celeb-video rv" href="https://www.youtube.com/shorts/fhmoa68_uHY" target="_blank" rel="noopener" aria-label="Watch Trisha Yearwood's story on YouTube">
      <span class="play"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5z" fill="#1C2B3A"/></svg></span>
    </a>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head split rv">
      <div>
        <div class="eyebrow">What we help with</div>
        <h2>If any of this describes your daily life, you're in the right place.</h2>
      </div>
      <a class="btn btn-ghost" href="what-we-help-with.html">Explore every concern <span class="arrow">→</span></a>
    </div>
    <div class="concern-grid rv">
{ccards_html}    </div>
    <div class="family-row rv">
      <div class="fr-copy">
        <div class="eyebrow" style="color:var(--sage)">Children &amp; families</div>
        <h3>Bright kids who are trying hard &mdash; and still struggling.</h3>
        <p>Homework battles. Meltdowns over transitions. Teacher emails. Sensory overwhelm. A child starting to say "I'm just bad at school." There's nothing your child has to get right in a LENS session, and a parent joins every check-in.</p>
        <a class="btn btn-invert" href="children-families.html">How we work with children</a>
      </div>
      {ph('child-session.jpg', 340, '', '60% 30%')}
    </div>
  </div>
</section>

<section class="sec sec-ivory2">
  <div class="wrap goals-grid">
    <div class="rv">
      <div class="eyebrow">What could change</div>
      <h2 style="margin:22px 0 18px">The goals our clients name most often are small, concrete, and worth everything.</h2>
      <div class="note-sage">These are the areas clients most often hope to support &mdash; framed honestly. LENS is not a guaranteed outcome, and every nervous system responds differently. We track your experience at every visit so progress is never a guessing game.</div>
    </div>
    <ul class="goals-list rv">
      <li>Calmer mornings, fewer standoffs</li>
      <li>Falling asleep more easily</li>
      <li>Greater focus at school or work</li>
      <li>Recovering from frustration faster</li>
      <li>Feeling less mentally exhausted</li>
      <li>Remembering conversations and tasks</li>
      <li>More patience with the people you love</li>
      <li>Handling normal stress without overwhelm</li>
      <li>Following through on what you start</li>
      <li>Feeling more like yourself again</li>
    </ul>
  </div>
</section>

<section class="sec">
  <div class="wrap lens-grid">
    <div class="rv">
      <div class="eyebrow">How LENS works</div>
      <h2 style="margin:22px 0 18px">Feedback, not force.</h2>
      <p style="margin-bottom:16px">LENS &mdash; the Low Energy Neurofeedback System &mdash; reads your brain's activity through small sensors and reflects a faint, imperceptible signal back to it: a clearer mirror the brain can use to notice its own stuck patterns and support its natural ability to settle and regulate.</p>
      <p class="sub" style="font-size:16px">Nothing is forced and nothing is added. It's a wellness service &mdash; not a medical treatment &mdash; and experiences vary.</p>
      <svg class="wave" width="360" height="44" viewBox="0 0 360 44" fill="none"><path d="M0 24 C10 4, 20 42, 32 21 S 52 2, 66 28 S 92 40, 112 20 S 148 12, 182 24 S 250 28, 300 23 S 340 22.5, 360 23" stroke="#5E7360" stroke-width="1.6" stroke-linecap="round"/><path d="M0 24 C10 4, 20 42, 32 21 S 52 2, 66 28" stroke="#A9853F" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></svg>
      <a class="btn btn-ghost" href="how-lens-works.html">The full explanation <span class="arrow">→</span></a>
    </div>
    <div class="lens-seq rv">
      <div class="row"><div class="n">1</div><div><h4>Sit back</h4><p>A comfortable chair, a quiet room, small sensors placed gently on the scalp.</p></div></div>
      <div class="row"><div class="n">2</div><div><h4>Nothing to perform</h4><p>No screens, tasks, or concentrating. Children don't have to sit perfectly still.</p></div></div>
      <div class="row"><div class="n">3</div><div><h4>Brief by design</h4><p>Most visits fit inside a lunch break or a school pickup.</p></div></div>
      <div class="row"><div class="n">4</div><div><h4>Reviewed with you</h4><p>Sleep, mood, focus, and energy are tracked at every visit &mdash; and your plan adjusts.</p></div></div>
    </div>
  </div>
</section>

<section class="sec sec-navy">
  <div class="wrap">
    <div class="sec-head rv">
      <div class="eyebrow">The client journey</div>
      <h2>One clear path, the same at every center.</h2>
      <p class="sub">No referral needed, nothing to prepare, and you'll always know what comes next.</p>
    </div>
    <div class="journey rv">
      <div class="jstep"><div class="n">1</div><h3>Talk with us</h3><p>A free conversation &mdash; phone or in person. Ask anything.</p></div>
      <div class="jstep"><div class="n">2</div><h3>Consult &amp; map</h3><p>A gentle assessment of how your brain is currently working.</p></div>
      <div class="jstep"><div class="n">3</div><h3>Begin sessions</h3><p>A personalized series of short, comfortable LENS visits.</p></div>
      <div class="jstep"><div class="n">4</div><h3>Track what matters</h3><p>Sleep, focus, mood, and energy reviewed at every check-in.</p></div>
      <div class="jstep"><div class="n">5</div><h3>Adjust as needed</h3><p>Your plan follows your experience &mdash; never a template.</p></div>
    </div>
    <div style="margin-top:70px;display:flex;gap:26px;align-items:center" class="rv">
      <a class="btn btn-invert" href="first-visit.html">See what the first visit is like</a>
      <span style="color:rgba(251,248,241,.55);font-size:15px">Most new clients start within a week of their first call.</span>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head rv">
      <div class="eyebrow">The Harmonized care model</div>
      <h2>The same standard of care, at every center, from every practitioner.</h2>
    </div>
    <div class="care-grid rv">
      <div class="care"><h4>Trained to one standard</h4><p>Every practitioner completes the same founder-led LENS training and works from the same clinical playbook &mdash; so your experience doesn't depend on which center you walk into.</p></div>
      <div class="care"><h4>Progress tracked at every visit</h4><p>A structured check-in on sleep, mood, focus, and energy opens every session. Your plan is adjusted from your data, not from habit.</p></div>
      <div class="care"><h4>Team-based care</h4><p>Your practitioner stays with you, and the wider team reviews progress together &mdash; you're never dependent on a single person's availability.</p></div>
      <div class="care"><h4>Honest by policy</h4><p>No large packages sold up front, no promised outcomes, and a plain answer if we think LENS isn't the right fit for you.</p></div>
    </div>
    <div class="founder-note rv">
      {ph('founder.jpg', 230, '', 'center 22%')}
      <div>
        <blockquote>&ldquo;We built Harmonized so that every family gets the same thing my first clients got: someone who listens longer than any appointment they've ever had &mdash; and a gentle option that works with the brain, not against it.&rdquo;</blockquote>
        <cite>Sheri [Last name &mdash; confirm] &middot; Founder &amp; Clinical Director &middot; <a href="founder.html" style="color:var(--sage-deep)">Her story →</a></cite>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-ivory2">
  <div class="wrap">
    <div class="sec-head split rv">
      <div>
        <div class="eyebrow">Client stories</div>
        <h2>The changes people mention first are small &mdash; and unmistakable.</h2>
      </div>
      <a class="btn btn-ghost" href="stories.html">More client stories <span class="arrow">→</span></a>
    </div>
    <div class="quote-grid rv">
      <div class="quote"><div class="theme">Focus &middot; Children</div><p>&ldquo;For the first time in two years, homework isn't a fight. He sits down, does it, and moves on. I didn't realize how much tension had left the house until it was gone.&rdquo;</p><footer><b>Parent of a 9-year-old</b> &middot; Nashville</footer></div>
      <div class="quote"><div class="theme">Sleep &middot; Adults</div><p>&ldquo;I came in exhausted and skeptical. What sold me was that nobody oversold anything &mdash; they just kept asking how I was sleeping. By week four: better than I had in years.&rdquo;</p><footer><b>Adult client</b> &middot; Murfreesboro</footer></div>
    </div>
    <div class="review-band rv">
      <div><strong>[4.x] ★</strong><span>Google rating across locations</span><span class="todo">Insert verified rating &amp; count</span></div>
      <div><strong>[N] reviews</strong><span>From Nashville &amp; Murfreesboro clients</span><span class="todo">Link live review profiles</span></div>
      <div><strong>Video stories</strong><span>Client interviews, in their own words</span><span class="todo">Film 2&ndash;3 short testimonials</span></div>
    </div>
    <p class="sample-note">Quotes are sample copy for design review &mdash; replace with verified client quotes before launch. Individual experiences vary.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head split rv">
      <div>
        <div class="eyebrow">Locations</div>
        <h2>One organization. Convenient centers across Middle Tennessee.</h2>
      </div>
      <a class="btn btn-ghost" href="locations.html">All locations <span class="arrow">→</span></a>
    </div>
    <div class="loc-grid rv">
      <div class="loc-card">{ph('session-room.jpg', 240, '', 'center 55%')}<div class="body"><h3>Nashville</h3><div class="city">Davidson County</div><div class="meta"><b>[Street address]</b><br>Mon&ndash;Fri 9a&ndash;6p &middot; Sat by appt<br>(615) 000-0000</div><a class="go" href="location-nashville.html">Explore this location →</a></div></div>
      <div class="loc-card">{plate('Murfreesboro interior — reception or session room, natural light', 240)}<div class="body"><h3>Murfreesboro</h3><div class="city">Rutherford County</div><div class="meta"><b>[Street address]</b><br>Mon&ndash;Fri 9a&ndash;6p &middot; Sat by appt<br>(615) 000-0000</div><a class="go" href="location-nashville.html">Explore this location →</a></div></div>
      <div class="loc-card">{plate('Franklin exterior — storefront at golden hour', 240)}<div class="body"><h3>Franklin <span class="soon">Coming soon</span></h3><div class="city">Williamson County</div><div class="meta"><b>Opening [DATE — confirm]</b><br>Join the waitlist for founding-client openings<br>(615) 000-0000</div><a class="go" href="contact.html">Join the Franklin waitlist →</a></div></div>
    </div>
  </div>
</section>

<section class="sec sec-tight">
  <div class="wrap" style="max-width:900px">
    <div class="sec-head rv"><div class="eyebrow">Before you call</div><h2>The three questions everyone asks first.</h2></div>
    <div class="faq-list rv">
      <details class="faq"><summary>Is LENS safe? Does it hurt?</summary><div class="a">LENS is gentle and noninvasive &mdash; nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. Most people, including young children, feel nothing at all during a session.</div></details>
      <details class="faq"><summary>Is this therapy or medical treatment?</summary><div class="a">Neither. We're a wellness practice. LENS doesn't diagnose or treat medical conditions, and it works alongside &mdash; never in place of &mdash; your doctor, therapist, or school supports.</div></details>
      <details class="faq"><summary>How many sessions will I need?</summary><div class="a">It genuinely varies. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front.</div></details>
    </div>
    <a class="btn btn-ghost rv" style="margin-top:30px" href="faq.html">All questions, answered plainly <span class="arrow">→</span></a>
  </div>
</section>
'''
page('index.html', 'Feel like yourself again', '', body)

# ============================================================ WHAT WE HELP WITH
ENTRIES = [
 ("Anxiety &amp; nervous-system overload","Adults &amp; children","concern-anxiety.html",
  "A body that stays braced long after the stressful moment has passed. Racing thoughts at bedtime. Overreacting to small stressors, and unable to relax even when life is calm.",
  "Sessions are calm by design — quiet room, comfortable chair, nothing asked of you. Many clients report a growing settledness they notice outside our walls first."),
 ("Focus, ADHD &amp; follow-through","Adults &amp; children","concern-anxiety.html",
  "Homework that takes three hours and ends in tears. Projects that stall at 90 percent. Losing track mid-task, and procrastinating on things you genuinely care about.",
  "LENS supports the brain's own capacity to settle and organize — nothing to practice, no tasks to perform. Focus and follow-through are tracked at every check-in."),
 ("Sleep difficulties","Adults &amp; children","concern-anxiety.html",
  "A mind that won't shut off at night. Waking at 3 a.m. for no reason. Sleeping many hours and still waking exhausted.",
  "Sleep is one of the first things we ask about at every visit, because it's often where clients notice change earliest. Your plan adjusts to what your nights are telling us."),
 ("Emotional regulation","Often children — and their parents","concern-anxiety.html",
  "Becoming overwhelmed quickly. Intense reactions that are hard to stop. Struggling with transitions, and staying upset long after the original problem has passed.",
  "There's nothing a child has to get right in a LENS session — which matters for kids tired of being corrected. Parents join every check-in."),
 ("Brain fog, memory &amp; mental fatigue","Most often adults","concern-anxiety.html",
  "Thinking that feels slow or cloudy. Losing words mid-sentence. Forgetting why you entered the room, and feeling cognitively exhausted by normal responsibilities.",
  "We start with a gentle map of how your brain is currently working, then track clarity, recall, and mental energy across your sessions."),
 ("Stress &amp; resilience","Most often adults","concern-anxiety.html",
  "Functioning, but close to burnout. Rest that doesn't restore. Carrying stress physically, and unable to recover after difficult days.",
  "Sessions are short enough to keep in a full life — and they ask nothing of you. For many clients, that genuine off-switch is where things begin to turn."),
 ("Children, school &amp; transitions","Children &amp; teens","concern-anxiety.html",
  "A bright kid who can't show what they know. Morning battles, meltdowns, sensory overwhelm, low frustration tolerance — a child trying hard and still struggling.",
  "Kids don't have to sit still, concentrate, or perform. We track what matters at home: mornings, homework, and how they talk about themselves."),
 ("Trauma-related stress","Adults &amp; children","concern-anxiety.html",
  "When the past keeps the present from feeling safe. Staying vigilant in rooms where nothing is wrong — with sleep, focus, and calm carrying the weight.",
  "LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable, and pair well with the therapy or support you already trust."),
]
entries_html = ''
for i,(t,who,href,rec,app) in enumerate(ENTRIES):
    entries_html += f'''<div class="entry rv">
  <div><h2>{t}</h2><div class="who">{who}</div></div>
  <div class="colB"><h4>You might recognize</h4><p>{rec}</p></div>
  <div class="colA"><h4>How we approach it</h4><p>{app}</p><a href="{href}">In depth <span class="arrow">→</span></a></div>
</div>\n'''
    if i == 3:
        entries_html += f'''<div class="rv" style="padding:60px 0;border-bottom:1px solid var(--line)">
  <div class="eyebrow" style="margin-bottom:32px">Gentle at every age</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:26px">
    {ph('child-sensor.jpg', 270, '', 'center 42%')}
    {ph('ear-clip-adult.jpg', 270, '', 'center 40%')}
    {ph('ear-clip-senior.jpg', 270, '', 'center 45%')}
  </div>
  <figcaption style="text-align:center">The same quiet, comfortable session — from grade school to grandparents</figcaption>
</div>\n'''

body = f'''
<section class="page-hero">
  <div class="wrap" style="display:grid;grid-template-columns:1.2fr .8fr;gap:70px;align-items:end">
    <div class="rv">
      <div class="eyebrow">What we help with</div>
      <h1>Start with what you're <em class="sage">living</em> — not with a label.</h1>
      <p class="sub">You don't need a diagnosis to be here. These are the concerns that most often bring adults and children through our doors, described the way real families describe them.</p>
    </div>
    <div class="rv" style="display:flex;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff">
      <a href="adults.html" style="flex:1;text-decoration:none;padding:26px 28px;border-right:1px solid var(--line)"><b style="display:block;font-family:var(--serif);font-size:22px;color:var(--navy);font-weight:600;margin-bottom:4px">For adults</b><span style="font-size:14px;color:var(--slate)">Focus, sleep, stress, and feeling like yourself</span></a>
      <a href="children-families.html" style="flex:1;text-decoration:none;padding:26px 28px"><b style="display:block;font-family:var(--serif);font-size:22px;color:var(--navy);font-weight:600;margin-bottom:4px">For children</b><span style="font-size:14px;color:var(--slate)">School, emotions, and calmer days at home</span></a>
    </div>
  </div>
</section>

<section class="sec-tight"><div class="wrap">
{entries_html}
</div></section>

<section class="sec sec-ivory2">
  <div class="wrap split">
    <div class="rv">
      <div class="eyebrow">A note on honesty</div>
      <h2>We'd rather earn your trust than your booking.</h2>
      <p>If what you're navigating isn't a fit for LENS, we'll say so in your first conversation — and point you toward what might serve you better. We work alongside therapists, physicians, and schools, not in place of them.</p>
      <div class="note-sage">We don't diagnose conditions or promise outcomes, and every person's experience is different. What we do promise: honest guidance, gentle sessions, and careful attention to how you actually feel.</div>
    </div>
    <div class="rv">{ph('concierge.jpg', 500, '', 'center 38%')}</div>
  </div>
</section>
'''
page('what-we-help-with.html', 'What We Help With', 'help', body,
     cta_args={'h': "Not sure which of these is you? That's what the first conversation is for."})

# ============================================================ CONCERN TEMPLATE (Anxiety)
body = f'''
{crumb(('What We Help With','what-we-help-with.html'),('Anxiety &amp; nervous-system overload',None))}
<section class="page-hero">
  <div class="wrap split" style="align-items:center">
    <div class="rv">
      <div class="eyebrow">Concern &middot; Adults &amp; children</div>
      <h1>Anxiety &amp; nervous-system <em class="sage">overload</em></h1>
      <p class="sub">For people whose bodies stay on alert long after the moment has passed — and who are tired of being told to just relax.</p>
      <div class="hero-ctas" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">Talk With Our Team</a><a class="btn btn-ghost" href="how-lens-works.html">How LENS works <span class="arrow">→</span></a></div>
    </div>
    <div class="rv">{ph('relax.jpg', 460, '', 'center 40%')}</div>
  </div>
</section>

<section class="sec"><div class="wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:90px">
  <div class="rv">
    <div class="eyebrow">You might recognize</div>
    <ul class="goals-list" style="column-count:1;margin-top:26px">
      <li>Thoughts that won't quiet down — especially at night</li>
      <li>Feeling constantly on edge, braced for something</li>
      <li>Overreacting to small stressors, then replaying it</li>
      <li>Struggling to relax even when life is objectively calm</li>
      <li>Feeling mentally or physically stuck in high alert</li>
    </ul>
  </div>
  <div class="rv">
    <div class="eyebrow">How LENS may help</div>
    <p style="margin:26px 0 18px">An anxious nervous system is often a system working harder than it needs to — stuck in patterns of high alert. LENS offers the brain a clearer mirror of its own activity, supporting its natural capacity to settle and respond more flexibly.</p>
    <p class="sub" style="font-size:16px">Nothing is forced, nothing is added, and there's nothing to perform. We track how settled you actually feel — sleep, tension, reactivity — at every visit, and let your experience guide the plan.</p>
    <div class="note-sage" style="margin-top:24px">LENS is a wellness service, not a treatment for anxiety disorders. It works alongside — never in place of — care from your doctor or therapist. Individual experiences vary.</div>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">What clients hope to support</div><h2>The changes people in high alert most often name.</h2></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:34px" class="rv">
    <div class="quote"><div class="theme">Common goal</div><p>&ldquo;Falling asleep without an hour of ceiling-staring.&rdquo;</p></div>
    <div class="quote"><div class="theme">Common goal</div><p>&ldquo;A body that stands down when the moment has passed.&rdquo;</p></div>
    <div class="quote"><div class="theme">Common goal</div><p>&ldquo;Handling a normal Tuesday like a normal Tuesday.&rdquo;</p></div>
  </div>
</div></section>

<section class="sec"><div class="wrap" style="max-width:900px">
  <div class="sec-head rv"><div class="eyebrow">Fair questions</div><h2>Asked by almost everyone who comes in anxious.</h2></div>
  <div class="faq-list rv">
    <details class="faq"><summary>Will the session itself make me anxious?</summary><div class="a">It's one of the calmest hours of most clients' week: quiet room, comfortable chair, nothing to do or perform. You can bring a book, headphones, or a parent — whatever helps.</div></details>
    <details class="faq"><summary>Can I keep seeing my therapist?</summary><div class="a">Please do. LENS is routinely used alongside therapy, and we're glad to coordinate with providers you already trust. We never advise on medication — that stays between you and your prescriber.</div></details>
    <details class="faq"><summary>When do people notice change?</summary><div class="a">It varies honestly — some notice shifts in sleep or settledness within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.</div></details>
  </div>
</div></section>
'''
page('concern-anxiety.html', 'Anxiety & Nervous-System Overload', 'help', body)

# ============================================================ ADULTS
body = f'''
{crumb(('What We Help With','what-we-help-with.html'),('For adults',None))}
<section class="page-hero"><div class="wrap split" style="align-items:center">
  <div class="rv">
    <div class="eyebrow">For adults</div>
    <h1>Functioning isn't the same as <em class="sage">feeling like yourself.</em></h1>
    <p class="sub">You're holding the job, the family, the calendar. And you're exhausted, foggy, wired at midnight, or a shorter version of yourself than you'd like to be. That's what we work on.</p>
    <div class="hero-ctas" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">Talk With Our Team</a></div>
  </div>
  <div class="rv">{ph('ear-clip-adult.jpg', 460, '', 'center 40%')}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">Where adults start</div><h2>The six concerns adults bring us most.</h2></div>
  <div class="concern-grid rv">
    <div class="ccard"><h3>Anxiety &amp; stress</h3><div class="aud">Most common</div><ul><li>On edge with no off-switch</li><li>Racing thoughts at night</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
    <div class="ccard"><h3>Focus &amp; ADHD</h3><div class="aud">Adults too — not just kids</div><ul><li>Stalling at 90% done</li><li>Overwhelmed by multi-step work</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
    <div class="ccard"><h3>Sleep</h3><div class="aud">Often the first change</div><ul><li>Can't fall or stay asleep</li><li>Rested is a memory</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
    <div class="ccard"><h3>Brain fog &amp; memory</h3><div class="aud">Cloudy, slow, word-hunting</div><ul><li>Rereading the same paragraph</li><li>Cognitively spent by 2 p.m.</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
    <div class="ccard"><h3>Emotional regulation</h3><div class="aud">Short fuse, long recovery</div><ul><li>Snapping at people you love</li><li>Staying upset past the moment</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
    <div class="ccard"><h3>Performance &amp; resilience</h3><div class="aud">Functioning near burnout</div><ul><li>Rest that doesn't restore</li><li>Wanting more margin, not more hacks</li></ul><a href="concern-anxiety.html">Read more <span class="arrow">→</span></a></div>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap split">
  <div class="rv">{ph('recline.jpg', 480, '', 'center 55%')}</div>
  <div class="rv">
    <div class="eyebrow">Built for full calendars</div>
    <h2>Short sessions. Nothing to practice. No homework.</h2>
    <p>Visits fit inside a lunch break, there's nothing to master between sessions, and your progress review takes minutes — because we've been tracking it all along.</p>
    <a class="btn btn-ghost" href="first-visit.html">What the first visit looks like <span class="arrow">→</span></a>
  </div>
</div></section>
'''
page('adults.html', 'For Adults', 'help', body)

# ============================================================ CHILDREN & FAMILIES
body = f'''
{crumb(('What We Help With','what-we-help-with.html'),('Children &amp; families',None))}
<section class="page-hero"><div class="wrap split" style="align-items:center">
  <div class="rv">
    <div class="eyebrow">Children &amp; families</div>
    <h1>Your child isn't lazy, broken, or "bad at school."</h1>
    <p class="sub">Homework battles, meltdowns, hard transitions, sensory overwhelm — bright kids trying hard and still struggling. We work gently, and we work with the whole family.</p>
    <div class="hero-ctas" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">Talk With Our Team</a><a class="btn btn-ghost" href="first-visit.html">A child's first visit <span class="arrow">→</span></a></div>
  </div>
  <div class="rv">{ph('child-sensor.jpg', 460, '', 'center 42%')}</div>
</div></section>

<section class="sec"><div class="wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:90px">
  <div class="rv">
    <div class="eyebrow">What parents are seeing</div>
    <ul class="goals-list" style="column-count:1;margin-top:26px">
      <li>Homework battles and morning standoffs</li>
      <li>Trouble focusing at school</li>
      <li>Emotional meltdowns and hard transitions</li>
      <li>Sleep struggles</li>
      <li>Sensory overwhelm and low frustration tolerance</li>
      <li>A child who's trying hard — and starting to give up</li>
    </ul>
  </div>
  <div class="rv">
    <div class="eyebrow">Why kids do well here</div>
    <p style="margin:26px 0 18px">There is nothing a child has to get right in a LENS session. No sitting perfectly still, no concentrating, no being corrected. Kids read, draw, or just be kids while the session runs.</p>
    <p class="sub" style="font-size:16px">A parent joins every check-in, and we track what actually matters at home: mornings, homework, sleep — and how your child talks about themselves.</p>
    <div class="note-sage" style="margin-top:24px">We coordinate happily with teachers, therapists, and pediatricians. LENS is a wellness service and never replaces their care.</div>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">Inside our children's rooms</div><h2>Made for kids — without feeling childish.</h2></div>
  <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:26px" class="rv">
    {ph('child-session.jpg', 320, '', '60% 30%')}
    {ph('art-wall.jpg', 320, '', 'center 45%')}
    {plate('Parent and child in consultation with practitioner — warm, candid', 320)}
  </div>
  <figcaption>The drawing wall at Nashville — every piece from a client, every piece earned</figcaption>
</div></section>
'''
page('children-families.html', 'Children & Families', 'help', body)

# ============================================================ HOW LENS WORKS
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">How LENS works</div>
  <h1>Your brain already knows how to settle. LENS gives it a <em class="sage">clearer mirror.</em></h1>
  <p class="sub" style="max-width:64ch">LENS stands for Low Energy Neurofeedback System. Here's the whole idea without the jargon — and exactly what a session feels like from the chair.</p>
  <div style="max-width:880px;margin:52px auto 0">
    <svg viewBox="0 0 900 90" fill="none" width="100%"><path d="M0 48 C14 8, 26 86, 42 42 S 66 2, 84 56 S 112 88, 132 40 S 164 10, 188 52 S 226 74, 258 44 S 310 26, 356 48 S 430 58, 500 46 S 620 42, 720 45 S 840 45.5, 900 45" stroke="#5E7360" stroke-width="1.8" stroke-linecap="round"/><path d="M0 48 C14 8, 26 86, 42 42 S 66 2, 84 56 S 112 88, 132 40" stroke="#A9853F" stroke-width="1.8" stroke-linecap="round" opacity=".8"/></svg>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--slate);font-weight:600;margin-top:12px"><span>A brain working harder than it needs to</span><span style="color:var(--sage-deep)">The same brain, running more efficiently</span></div>
  </div>
</div></section>

<section class="sec"><div class="wrap split">
  <div class="rv">
    <div class="eyebrow">The idea, plainly</div>
    <h2>Feedback, not force.</h2>
    <p>Through stress, strain, or simply life, the brain can settle into patterns that work against you — staying on alert when nothing's wrong, or fogging over when you need to think.</p>
    <p>During a session, small sensors read your brain's activity in real time, and the system reflects a faint, imperceptible signal back — a mirror the brain can use to notice its own stuck patterns.</p>
    <p>What happens next is up to your brain, not the machine. Given clearer information, brains tend to do what they were built to do: reorganize, settle, and run more efficiently.</p>
  </div>
  <div class="rv">{ph('glass-head.jpg', 500, '', 'center 40%')}</div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">A session, start to finish</div><h2>What it feels like from the chair.</h2><p class="sub">Most visits are over in well under an hour.</p></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line)" class="rv">
    <div style="padding:40px 34px 10px 0;border-right:1px solid var(--line)"><div class="eyebrow" style="font-size:11px">Arrive</div><h3 style="margin:14px 0 10px">A real check-in</h3><p style="font-size:15px;color:var(--slate)">Sleep, mood, focus, energy — how we know what's actually changing for you.</p></div>
    <div style="padding:40px 34px 10px 34px;border-right:1px solid var(--line)"><div class="eyebrow" style="font-size:11px">Settle</div><h3 style="margin:14px 0 10px">Sensors on, feet up</h3><p style="font-size:15px;color:var(--slate)">A comfortable chair and a few small sensors. No gel caps, no discomfort.</p></div>
    <div style="padding:40px 34px 10px 34px;border-right:1px solid var(--line)"><div class="eyebrow" style="font-size:11px">Session</div><h3 style="margin:14px 0 10px">Nothing to do</h3><p style="font-size:15px;color:var(--slate)">The feedback lasts moments; most people feel nothing. Kids can just be kids.</p></div>
    <div style="padding:40px 0 10px 34px"><div class="eyebrow" style="font-size:11px">Before you go</div><h3 style="margin:14px 0 10px">Review &amp; adjust</h3><p style="font-size:15px;color:var(--slate)">Your practitioner fine-tunes the plan; you leave knowing where things stand.</p></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:26px;margin-top:70px" class="rv">
    <figure>{ph('ear-clip.jpg', 280, '', 'center 45%')}<figcaption>Small sensors, gently placed</figcaption></figure>
    <figure>{ph('map-points.jpg', 280, '', 'center 45%')}<figcaption>Your map, point by point</figcaption></figure>
    <figure>{ph('lensware.jpg', 280, '', 'center 45%')}<figcaption>Reviewed with you, every visit</figcaption></figure>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">Setting expectations</div><h2>What LENS is — and what it isn't.</h2></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff" class="rv">
    <div style="padding:52px 54px;border-right:1px solid var(--line)"><h3 style="font-family:var(--sans);font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--sage-deep);margin-bottom:24px">LENS is</h3>
      <ul class="goals-list" style="column-count:1"><li>Gentle and noninvasive — nothing enters the body</li><li>Passive — no concentrating or performing</li><li>Brief — sessions fit real, busy lives</li><li>Personalized from your check-ins, every visit</li><li>A wellness service alongside the care you trust</li></ul></div>
    <div style="padding:52px 54px;background:var(--navy)"><h3 style="font-family:var(--sans);font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--sage);margin-bottom:24px">LENS is not</h3>
      <ul style="list-style:none">
        <li style="padding:13px 0 13px 28px;position:relative;color:rgba(251,248,241,.85);border-bottom:1px solid rgba(251,248,241,.12)"><span style="position:absolute;left:0;top:24px;width:14px;height:1.5px;background:var(--gold)"></span>A medical treatment, diagnosis, or cure</li>
        <li style="padding:13px 0 13px 28px;position:relative;color:rgba(251,248,241,.85);border-bottom:1px solid rgba(251,248,241,.12)"><span style="position:absolute;left:0;top:24px;width:14px;height:1.5px;background:var(--gold)"></span>Electrical stimulation — it reads far more than it sends</li>
        <li style="padding:13px 0 13px 28px;position:relative;color:rgba(251,248,241,.85);border-bottom:1px solid rgba(251,248,241,.12)"><span style="position:absolute;left:0;top:24px;width:14px;height:1.5px;background:var(--gold)"></span>A screen-based training program to master</li>
        <li style="padding:13px 0 13px 28px;position:relative;color:rgba(251,248,241,.85);border-bottom:1px solid rgba(251,248,241,.12)"><span style="position:absolute;left:0;top:24px;width:14px;height:1.5px;background:var(--gold)"></span>A guaranteed outcome — every brain responds differently</li>
        <li style="padding:13px 0 13px 28px;position:relative;color:rgba(251,248,241,.85)"><span style="position:absolute;left:0;top:24px;width:14px;height:1.5px;background:var(--gold)"></span>A replacement for your doctor, therapist, or school supports</li>
      </ul></div>
  </div>
</div></section>
'''
page('how-lens-works.html', 'How LENS Works', 'lens', body,
     cta_args={'h':'The best way to understand LENS is to talk with someone who does it every day.'})

# ============================================================ YOUR FIRST VISIT
body = f'''
<section class="page-hero"><div class="wrap split" style="align-items:center">
  <div class="rv">
    <div class="eyebrow">Your first visit</div>
    <h1>Know exactly what to expect — before you ever walk in.</h1>
    <p class="sub">No clipboard queue, no waiting-room limbo, no surprises. Here's the first visit, minute by minute, for adults and for children.</p>
    <div class="hero-ctas" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">Talk With Our Team</a></div>
    <p class="micro">Plan for about [60–90] minutes <span style="color:var(--gold)">[CONFIRM duration]</span> &middot; Nothing to prepare or bring</p>
  </div>
  <div class="rv">{ph('checkin.jpg', 480, '', '68% 35%')}</div>
</div></section>

<section class="sec"><div class="wrap" style="max-width:940px">
  <div class="sec-head rv"><div class="eyebrow">Minute by minute</div><h2>The first appointment, in five parts.</h2></div>
  <div class="lens-seq rv" style="border-top:1px solid var(--line)">
    <div class="row"><div class="n">1</div><div><h4>You're greeted by name</h4><p>Someone is expecting you. Coffee, water, a comfortable seat — and a parent stays with a child the whole time.</p></div></div>
    <div class="row"><div class="n">2</div><div><h4>We talk first</h4><p>What's going on, what you've tried, what you're hoping changes. This is the longest part on purpose.</p></div></div>
    <div class="row"><div class="n">3</div><div><h4>A gentle brain map</h4><p>Small sensors take brief readings at a series of points — nothing invasive, nothing to feel. It maps how your brain is currently working.</p></div></div>
    <div class="row"><div class="n">4</div><div><h4>Your plan, explained plainly</h4><p>What we noticed, what we'd suggest, what it costs, and what we'd track — in plain language, with every question answered.</p></div></div>
    <div class="row"><div class="n">5</div><div><h4>You decide — without pressure</h4><p>Start that week, think it over, or decide it's not for you. No packages, no countdown offers, no follow-up pestering.</p></div></div>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">Good to know</div><h2>The practical details.</h2></div>
  <div class="care-grid rv">
    <div class="care"><h4>What it costs</h4><p>The consultation conversation is free. Session and mapping pricing is straightforward and shared before you commit to anything. <span style="color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase">[Insert verified pricing]</span></p></div>
    <div class="care"><h4>Insurance</h4><p>As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we'll give you documentation. <span style="color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase">[Confirm HSA/FSA policy]</span></p></div>
    <div class="care"><h4>Bringing a child</h4><p>A parent joins everything. Kids can bring a book, a tablet, or a stuffed animal — comfort beats stillness here.</p></div>
    <div class="care"><h4>After you leave</h4><p>Most people simply go back to their day. We'll check how you slept and felt at the next visit — that's the data that shapes your plan.</p></div>
  </div>
</div></section>
'''
page('first-visit.html', 'Your First Visit', 'visit', body,
     cta_args={'h':'Still have a question about the first visit? Just ask.','sub':'Call or send a note — a real person will answer it plainly, usually within one business day.'})

# ============================================================ ABOUT
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">About Harmonized Brain Centers</div>
  <h1>Large enough to trust. Personal enough to <em class="sage">care.</em></h1>
  <p class="sub" style="max-width:66ch">Harmonized Brain Centers is a team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers, and 140,000+ sessions of experience.</p>
</div></section>

<div class="proof rv" style="margin-top:0;border-top:0">
  <div class="wrap-wide proof-grid">
    <div><strong>140,000+</strong><span>sessions provided</span></div>
    <div><strong>3 centers</strong><span>and growing across the region</span></div>
    <div><strong>One standard</strong><span>founder-led training for every practitioner</span></div>
    <div><strong>Every visit</strong><span>progress tracked with a structured check-in</span></div>
  </div>
</div>

<section class="sec"><div class="wrap split">
  <div class="rv">{ph('session-wide.jpg', 500, '', 'center 40%')}</div>
  <div class="rv">
    <div class="eyebrow">Why we exist</div>
    <h2>Families deserved a gentle option — and an honest one.</h2>
    <p>Harmonized began with a simple conviction: people struggling with focus, sleep, anxiety, and overwhelm deserve an approach that works with the brain's own capacity to regulate — and a team that listens before it recommends anything.</p>
    <p>Today that conviction is a care model: the same training, the same structured check-ins, the same honest policies at every center — so the experience doesn't depend on which door you walk through.</p>
    <a class="btn btn-ghost" href="founder.html">The founder's story <span class="arrow">→</span></a>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">The Harmonized care model</div><h2>What's identical at every center.</h2></div>
  <div class="care-grid rv">
    <div class="care"><h4>Practitioner training</h4><p>Every practitioner completes the same founder-led LENS curriculum and apprenticeship before working independently.</p></div>
    <div class="care"><h4>Structured progress tracking</h4><p>A consistent seven-item check-in for adults and children opens every session — your plan follows your data.</p></div>
    <div class="care"><h4>Team-based care</h4><p>Practitioners review progress together. You're never dependent on one person's memory or availability.</p></div>
    <div class="care"><h4>Responsible communication</h4><p>No diagnoses, no promised outcomes, no pressure. If LENS isn't the right fit, we say so — and help you find what is.</p></div>
  </div>
</div></section>

<section class="sec"><div class="wrap split">
  <div class="rv">
    <div class="eyebrow">The team</div>
    <h2>More hands, one standard.</h2>
    <p>Harmonized is deliberately built to grow beyond any one person — practitioners across our centers, trained to the same standard, supported by the same systems.</p>
    <a class="btn btn-ghost" href="team.html">Meet the team <span class="arrow">→</span></a>
  </div>
  <div class="rv" style="display:grid;grid-template-columns:1fr 1fr;gap:22px">
    {ph('founder.jpg', 300, '', 'center 22%')}
    {ph('practitioner-2.jpg', 300, '', '32% 18%')}
    {plate('Practitioner portrait — natural light', 300)}
    {plate('Practitioner portrait — natural light', 300)}
  </div>
</div></section>
'''
page('about.html', 'About', 'about', body)

# ============================================================ FOUNDER STORY
body = f'''
{crumb(('About','about.html'),('Our founder',None))}
<section class="page-hero"><div class="wrap split" style="align-items:center">
  <div class="rv">
    <div class="eyebrow">Founder &amp; Clinical Director</div>
    <h1>Sheri [Last name — confirm]</h1>
    <p class="sub">The clinical standard behind every Harmonized practitioner — and the reason the check-in question is always "how are you actually feeling?"</p>
  </div>
  <div class="rv">{ph('founder.jpg', 480, '', 'center 20%')}</div>
</div></section>

<section class="sec"><div class="wrap article rv">
  <p class="lede">[Founder story — 3–4 short paragraphs, drafted with Sheri: what led her to LENS, the first clients, the conviction that became the care model, and why the practice trains others rather than staying a solo practice.]</p>
  <blockquote>&ldquo;The measure of our work isn't a chart. It's how you actually feel, week to week.&rdquo;</blockquote>
  <p>[Paragraph on training the team: the curriculum, the apprenticeship, and what she looks for in a practitioner.]</p>
  <p>[Paragraph on what's next: Franklin, and bringing the same standard to more communities.]</p>
</div></section>

<section class="sec sec-ivory2"><div class="wrap split">
  <div class="rv">{ph('sensors-adult.jpg', 440, '', '62% 30%')}</div>
  <div class="rv">
    <div class="eyebrow">Still in the room</div>
    <h2>Founder-led doesn't mean founder-only.</h2>
    <p>Sheri still sees clients and personally trains every practitioner — but the Harmonized care model is designed so every client, at every center, gets the same standard she set.</p>
    <a class="btn btn-ghost" href="team.html">Meet the whole team <span class="arrow">→</span></a>
  </div>
</div></section>
'''
page('founder.html', 'Our Founder', 'about', body)

# ============================================================ TEAM
body = f'''
{crumb(('About','about.html'),('Our team',None))}
<section class="page-hero"><div class="wrap rv">
  <div class="eyebrow">Our team</div>
  <h1>Practitioners who will know your name — and your story.</h1>
  <p class="sub">Every Harmonized practitioner completes the same founder-led LENS training and works from the same care model. Here's who you'll meet.</p>
</div></section>

<section class="sec"><div class="wrap">
  <div class="team-grid rv">
    <div class="member">{ph('founder.jpg', 360, '', 'center 22%')}<h3>Sheri [Last name]</h3><div class="role">Founder &amp; Clinical Director</div><p>Sets the clinical standard, trains every practitioner, and still keeps a client schedule.</p><a class="btn btn-ghost" style="padding:10px 4px;font-size:14px" href="founder.html">Her story <span class="arrow">→</span></a></div>
    <div class="member">{ph('practitioner-2.jpg', 360, '', '32% 18%')}<h3>[Practitioner name]</h3><div class="role">Practitioner &middot; Children &amp; Teens</div><p>[Two lines: why they love working with kids, and how they put nervous first-timers at ease.]</p><a class="btn btn-ghost" style="padding:10px 4px;font-size:14px" href="practitioner.html">Profile <span class="arrow">→</span></a></div>
    <div class="member">{plate('Practitioner portrait — natural light, ivory backdrop', 360)}<h3>[Practitioner name]</h3><div class="role">Practitioner &middot; Murfreesboro</div><p>[Two lines: background, years with Harmonized, and what clients say about working with them.]</p><a class="btn btn-ghost" style="padding:10px 4px;font-size:14px" href="practitioner.html">Profile <span class="arrow">→</span></a></div>
    <div class="member">{plate('Practitioner portrait — natural light, ivory backdrop', 360)}<h3>[Practitioner name]</h3><div class="role">Practitioner &middot; Nashville</div><p>[Two lines.]</p><a class="btn btn-ghost" style="padding:10px 4px;font-size:14px" href="practitioner.html">Profile <span class="arrow">→</span></a></div>
    <div class="member">{plate('Client care coordinator portrait', 360)}<h3>[Name]</h3><div class="role">Client Care Coordinator</div><p>The first voice you'll hear on the phone — and the person who keeps scheduling painless.</p></div>
    <div class="member">{plate('Franklin team portrait — hiring', 360)}<h3>Franklin team</h3><div class="role">Now hiring &middot; Opening [DATE]</div><p>Practitioners for our Franklin center train under Sheri before opening day.</p></div>
  </div>
</div></section>
'''
page('team.html', 'Our Team', 'about', body)

# ============================================================ PRACTITIONER PROFILE TEMPLATE
body = f'''
{crumb(('About','about.html'),('Our team','team.html'),('[Practitioner name]',None))}
<section class="page-hero"><div class="wrap" style="display:grid;grid-template-columns:380px 1fr;gap:80px;align-items:center">
  <div class="rv">{ph('practitioner-2.jpg', 440, '', '32% 18%')}</div>
  <div class="rv">
    <div class="eyebrow">Practitioner &middot; Children &amp; Teens &middot; Nashville</div>
    <h1>[Practitioner name]</h1>
    <p class="sub">[One-line personal summary — what clients say it's like to work with them.]</p>
    <div class="hero-ctas" style="margin-top:32px"><a class="btn btn-primary" href="contact.html">Request [First name]</a><a class="btn btn-ghost" href="location-nashville.html">Nashville center <span class="arrow">→</span></a></div>
  </div>
</div></section>

<section class="sec"><div class="wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:90px">
  <div class="rv">
    <div class="eyebrow">Background</div>
    <p style="margin:24px 0 18px">[Paragraph: professional background, path to LENS, time with Harmonized.]</p>
    <p class="sub" style="font-size:16px">[Paragraph: approach with clients — especially anxious first-timers and children.]</p>
  </div>
  <div class="rv">
    <div class="eyebrow">At a glance</div>
    <div class="lens-seq" style="margin-top:20px">
      <div class="row"><div class="n">—</div><div><h4>Training</h4><p>Harmonized founder-led LENS curriculum &middot; [certifications — confirm]</p></div></div>
      <div class="row"><div class="n">—</div><div><h4>Works most with</h4><p>Children &amp; teens &middot; focus &amp; school &middot; emotional regulation</p></div></div>
      <div class="row"><div class="n">—</div><div><h4>Location</h4><p>Nashville &middot; Tue–Sat</p></div></div>
    </div>
  </div>
</div></section>
'''
page('practitioner.html', 'Practitioner Profile', 'about', body)

# ============================================================ LOCATIONS OVERVIEW
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">Locations</div>
  <h1>One organization. The same care, closer to home.</h1>
  <p class="sub" style="max-width:60ch">Every Harmonized center runs the same care model, the same training, and the same honest policies. Your plan travels with you between centers.</p>
</div></section>

<section class="sec"><div class="wrap">
  <div class="loc-grid rv">
    <div class="loc-card">{ph('session-room.jpg', 260, '', 'center 55%')}<div class="body"><h3>Nashville</h3><div class="city">Davidson County</div><div class="meta"><b>[Street address], Nashville, TN [ZIP]</b><br>Mon–Fri 9a–6p &middot; Sat by appointment<br>(615) 000-0000 &middot; Free on-site parking<br>Practitioners: Sheri [L.], [Name], [Name]</div><a class="go" href="location-nashville.html">Explore this location →</a></div></div>
    <div class="loc-card">{plate('Murfreesboro — reception or session room, natural light', 260)}<div class="body"><h3>Murfreesboro</h3><div class="city">Rutherford County</div><div class="meta"><b>[Street address], Murfreesboro, TN [ZIP]</b><br>Mon–Fri 9a–6p &middot; Sat by appointment<br>(615) 000-0000 &middot; [Parking note]<br>Practitioners: [Name], [Name]</div><a class="go" href="location-nashville.html">Explore this location →</a></div></div>
    <div class="loc-card">{plate('Franklin — exterior storefront, golden hour', 260)}<div class="body"><h3>Franklin <span class="soon">Coming soon</span></h3><div class="city">Williamson County</div><div class="meta"><b>Opening [DATE — confirm]</b><br>Serving Franklin, Brentwood, Spring Hill &amp; Thompson's Station<br>Founding-client openings are limited</div><a class="go" href="contact.html">Join the Franklin waitlist →</a></div></div>
  </div>
  <div class="rv" style="margin-top:60px;display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff">
    <div style="padding:48px 52px">
      <div class="eyebrow">Concierge sessions at home</div>
      <h3 style="margin:16px 0 12px">For some families, we come to you.</h3>
      <p style="color:var(--slate);font-size:15.5px">Our concierge service brings the same practitioners and the same equipment to your home — helpful for packed family schedules and clients who settle best in their own space. <span style="color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase">[Confirm service area &amp; pricing]</span></p>
    </div>
    {ph('concierge.jpg', 280, '', 'center 38%')}
  </div>
</div></section>
'''
page('locations.html', 'Locations', 'loc', body,
     cta_args={'h':'Not sure which center is closest? Tell us where you are.','sub':'We\u2019ll match you with the nearest center — or the concierge service — in one quick conversation.'})

# ============================================================ LOCATION TEMPLATE (Nashville)
body = f'''
{crumb(('Locations','locations.html'),('Nashville',None))}
<section class="page-hero"><div class="wrap split" style="align-items:center">
  <div class="rv">
    <div class="eyebrow">Nashville, Tennessee</div>
    <h1>A quiet place to get your <em class="sage">bearings</em> back.</h1>
    <p class="sub">Serving families and professionals across Davidson County — a calm, comfortable center that feels more like a well-kept study than a clinic.</p>
    <div class="hero-ctas" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">Talk With Our Team</a><a class="btn btn-ghost" href="tel:+16150000000">Call (615) 000-0000</a></div>
    <div style="border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr 1fr;padding-top:22px;gap:28px;font-size:14.5px;color:var(--slate);margin-top:40px">
      <div><b style="display:block;font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">Address</b><span style="color:var(--ink)">[Street address]<br>Nashville, TN [ZIP]</span></div>
      <div><b style="display:block;font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">Hours</b><span style="color:var(--ink)">Mon–Fri 9a–6p<br>Sat by appointment</span></div>
      <div><b style="display:block;font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">Arrival</b><span style="color:var(--ink)">Free on-site parking,<br>steps from the door</span></div>
    </div>
  </div>
  <div class="rv">{ph('session-room.jpg', 560, 'hero-ph', 'center 55%')}</div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap">
  <div class="sec-head split rv">
    <div><div class="eyebrow">The space</div><h2>Designed to lower your shoulders the moment you walk in.</h2></div>
    <p class="sub" style="max-width:40ch">No fluorescent hum, no waiting-room churn. Quiet rooms, comfortable chairs, and a team that isn't rushing you anywhere.</p>
  </div>
  <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:26px" class="rv">
    {ph('recline.jpg', 330, '', 'center 55%')}
    {ph('session-wide.jpg', 330, '', 'center 40%')}
    {ph('art-wall.jpg', 330, '', 'center 45%')}
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head rv"><div class="eyebrow">Your Nashville team</div><h2>Trained to one standard. Yours from first call to final check-in.</h2></div>
  <div class="team-grid rv">
    <div class="member">{ph('founder.jpg', 340, '', 'center 22%')}<h3>Sheri [Last name]</h3><div class="role">Founder &amp; Clinical Director</div><p>Sets the standard every practitioner trains to — and still keeps a Nashville client schedule.</p></div>
    <div class="member">{ph('practitioner-2.jpg', 340, '', '32% 18%')}<h3>[Practitioner name]</h3><div class="role">Practitioner &middot; Children &amp; Teens</div><p>[Two lines: why they love working with kids, and how they put nervous first-timers at ease.]</p></div>
    <div class="member">{plate('Client care coordinator portrait — natural light', 340)}<h3>[Name]</h3><div class="role">Client Care Coordinator</div><p>The first voice you'll hear on the phone, and the person who keeps scheduling painless.</p></div>
  </div>
</div></section>

<section class="sec sec-navy"><div class="wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:90px;align-items:start">
  <div class="rv">
    <div class="eyebrow">Your first visit here</div>
    <h2 style="margin:20px 0 26px">Know exactly what to expect.</h2>
    <div class="lens-seq" style="border-color:rgba(251,248,241,.15)">
      <div class="row" style="border-color:rgba(251,248,241,.15)"><div class="n">1</div><div><h4 style="color:var(--ivory)">Greeted by name</h4><p>No clipboard queue, no waiting-room limbo.</p></div></div>
      <div class="row" style="border-color:rgba(251,248,241,.15)"><div class="n">2</div><div><h4 style="color:var(--ivory)">We talk first</h4><p>What's going on, what you've tried, what you hope changes.</p></div></div>
      <div class="row" style="border-color:rgba(251,248,241,.15)"><div class="n">3</div><div><h4 style="color:var(--ivory)">A gentle brain map</h4><p>Brief readings at a series of points — nothing to feel.</p></div></div>
      <div class="row" style="border-color:rgba(251,248,241,.15)"><div class="n">4</div><div><h4 style="color:var(--ivory)">Plan &amp; honest answers</h4><p>Commit only if it feels right. No packages, no pressure.</p></div></div>
    </div>
  </div>
  <div class="rv">
    <div class="eyebrow">From a Nashville family</div>
    <div class="quote" style="background:transparent;border-color:rgba(251,248,241,.18);box-shadow:none;margin-top:20px">
      <p style="color:var(--ivory)">&ldquo;I expected something clinical and intimidating. What I found was a calm room, people who listened longer than any appointment I've ever had, and — three months later — a kid who likes school again.&rdquo;</p>
      <footer style="color:rgba(251,248,241,.55)"><b style="color:var(--sage)">Parent of an 11-year-old</b> &middot; Nashville</footer>
    </div>
    <p class="sample-note" style="color:rgba(251,248,241,.4)">Sample copy — replace with a verified client quote.</p>
  </div>
</div></section>

<section class="sec"><div class="wrap split">
  <div class="rv" style="height:440px;border-radius:4px;background:linear-gradient(155deg,#E9EDE4 0%,#D6DDCF 60%,#C4CFBC 100%);position:relative;border:1px solid var(--line)">
    <div style="position:absolute;left:48%;top:42%;width:16px;height:16px;background:var(--gold);border-radius:50%;box-shadow:0 0 0 8px rgba(169,133,63,.18)"></div>
    <div style="position:absolute;left:22px;bottom:18px;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--sage-deep);font-weight:600">Embedded map — muted sage style</div>
  </div>
  <div class="rv">
    <div class="eyebrow">Planning your visit</div>
    <h2>Easy to reach from anywhere in the metro.</h2>
    <div class="lens-seq" style="margin-top:24px">
      <div class="row"><div class="n">—</div><div><h4>Getting here</h4><p>[Neighborhood, nearest cross streets, highway access.]</p></div></div>
      <div class="row"><div class="n">—</div><div><h4>Communities served</h4><p>Nashville, Belle Meade, Green Hills, Brentwood, Bellevue, Madison &amp; nearby. <span style="color:var(--gold);font-size:11px;letter-spacing:.1em;text-transform:uppercase">[Confirm list]</span></p></div></div>
      <div class="row"><div class="n">—</div><div><h4>Also nearby</h4><p>Murfreesboro center &middot; Franklin coming soon — transfer anytime; your plan travels with you.</p></div></div>
    </div>
  </div>
</div></section>
'''
page('location-nashville.html', 'Nashville', 'loc', body,
     cta_args={'h':'Come see the space, meet the team, and ask us anything.'})

# ============================================================ CLIENT STORIES
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">Client stories</div>
  <h1>Small changes. Real weeks. Honest telling.</h1>
  <p class="sub" style="max-width:60ch">No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell.</p>
</div></section>

<section class="sec"><div class="wrap">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:34px" class="rv">
    <div class="quote"><div class="theme">Focus &middot; Children</div><p>&ldquo;For the first time in two years, homework isn't a fight. He sits down, does it, and moves on.&rdquo;</p><footer><b>Parent of a 9-year-old</b> &middot; Nashville</footer></div>
    <div class="quote"><div class="theme">Sleep &middot; Adults</div><p>&ldquo;Nobody oversold anything — they just kept asking how I was sleeping. By week four: better than in years.&rdquo;</p><footer><b>Adult client</b> &middot; Murfreesboro</footer></div>
    <div class="quote"><div class="theme">Emotional regulation</div><p>&ldquo;The meltdowns didn't vanish. They got shorter — and she recovers now. That's the part that changed our house.&rdquo;</p><footer><b>Parent of a 7-year-old</b> &middot; Nashville</footer></div>
    <div class="quote"><div class="theme">Stress &amp; resilience</div><p>&ldquo;Hard days still happen. I just stopped losing the whole next day to them.&rdquo;</p><footer><b>Adult client</b> &middot; Nashville</footer></div>
    <div class="quote"><div class="theme">Brain fog</div><p>&ldquo;I read a full report without restarting the same paragraph. I texted my husband about it. That's where I was.&rdquo;</p><footer><b>Adult client</b> &middot; Murfreesboro</footer></div>
    <div class="quote"><div class="theme">School</div><p>&ldquo;His teacher emailed to ask what changed. First email from school I've ever been happy to open.&rdquo;</p><footer><b>Parent of a 10-year-old</b> &middot; Murfreesboro</footer></div>
  </div>
  <p class="sample-note rv">All quotes are sample copy for design review — replace with verified client quotes before launch.</p>
  <div class="review-band rv">
    <div><strong>[4.x] ★</strong><span>Google rating across locations</span><span class="todo">Insert verified rating &amp; count</span></div>
    <div><strong>[N] reviews</strong><span>Read them unfiltered on Google</span><span class="todo">Link live profiles</span></div>
    <div><strong>Video stories</strong><span>Client interviews in their own words</span><span class="todo">Film 2–3 short pieces</span></div>
  </div>
</div></section>

<section class="sec sec-ivory2"><div class="wrap split">
  <div class="rv">{ph('checkin.jpg', 460, '', '68% 35%')}</div>
  <div class="rv">
    <div class="eyebrow">Why the stories are specific</div>
    <h2>We track outcomes at every single visit.</h2>
    <p>Every session opens with a structured check-in on sleep, mood, focus, and energy. That's why our clients talk in specifics — homework, Tuesdays, paragraphs — instead of vague transformations.</p>
    <a class="btn btn-ghost" href="how-lens-works.html">How the check-ins work <span class="arrow">→</span></a>
  </div>
</div></section>
'''
page('stories.html', 'Client Stories', '', body)

# ============================================================ FAQ
FAQS = [
 ("What is LENS neurofeedback?","LENS — the Low Energy Neurofeedback System — reads your brain's activity through small sensors and reflects a faint, imperceptible signal back to it, supporting the brain's natural ability to settle and regulate. Nothing is forced, and there's nothing to perform."),
 ("Is it safe?","LENS is gentle and noninvasive. Nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. We'll walk you through exactly what to expect before anything begins."),
 ("Does it hurt?","No. Most people — including young children — feel nothing at all during a session."),
 ("Is it appropriate for children?","Yes. There's nothing a child has to get right: no sitting perfectly still, no concentrating, no being corrected. A parent joins every visit and every check-in."),
 ("Do I have to do anything during the session?","No. No screens to watch, tasks to complete, or skills to practice. You sit comfortably; many clients read or simply rest."),
 ("How long is a session?","Most visits are over in well under an hour — brief enough to fit a lunch break or a school pickup. <span style='color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase'>[Confirm typical length]</span>"),
 ("How many sessions will I need?","It genuinely varies from person to person. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front."),
 ("What does the first visit include?","A real conversation about what's going on, a gentle brain map, and a personalized plan explained in plain language — with every question answered before you decide anything. See <a href='first-visit.html' style='color:var(--sage-deep)'>Your First Visit</a>."),
 ("What kinds of concerns do clients come in with?","Most commonly: anxiety and stress, focus and ADHD, sleep, emotional regulation, brain fog and memory, burnout, school struggles, and trauma-related stress. See <a href='what-we-help-with.html' style='color:var(--sage-deep)'>What We Help With</a>."),
 ("Is this therapy or medical treatment?","Neither. We're a wellness practice. LENS doesn't diagnose or treat medical or psychiatric conditions, and it isn't a substitute for care from your doctor or therapist."),
 ("Can I continue seeing my doctor or therapist?","Please do. LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. We never advise on medication."),
 ("What does it cost?","The consultation conversation is free. Session and mapping pricing is straightforward and shared before you commit to anything. <span style='color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase'>[Insert verified pricing]</span>"),
 ("Does insurance cover it?","As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we can provide documentation. <span style='color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase'>[Confirm policy]</span>"),
 ("What if I'm unsure whether it's right for me?","That's exactly what the free conversation is for. Bring the skeptical questions — and if we think LENS isn't a good fit, we'll say so and point you toward what might serve you better."),
]
faq_html = ''.join(f'<details class="faq"><summary>{q}</summary><div class="a">{a}</div></details>\n' for q,a in FAQS)
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">Frequently asked questions</div>
  <h1>Every question, answered plainly.</h1>
  <p class="sub" style="max-width:56ch">Including the ones people are hesitant to ask. If yours isn't here, call — a real person answers during business hours.</p>
</div></section>
<section class="sec"><div class="wrap" style="max-width:900px"><div class="faq-list rv">
{faq_html}
</div></div></section>
'''
page('faq.html', 'FAQ', '', body)

# ============================================================ CONTACT
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">Talk with our team</div>
  <h1>Tell us what's going on. We'll take it from there.</h1>
  <p class="sub" style="max-width:56ch">A free, no-pressure conversation with a real person from your nearest center — usually within one business day. <span style="color:var(--gold);font-size:12px;letter-spacing:.1em;text-transform:uppercase">[Confirm response time]</span></p>
</div></section>

<section class="sec"><div class="wrap" style="display:grid;grid-template-columns:1.1fr .9fr;gap:90px;align-items:start">
  <div class="form rv" style="background:#fff;border:1px solid var(--line);border-radius:4px;padding:48px 52px">
    <div class="eyebrow">Request a conversation</div>
    <label>Who are we helping?</label>
    <div class="chips"><span class="chip on">My child</span><span class="chip">Myself</span><span class="chip">Someone else</span></div>
    <label>What's bringing you in? <span style="color:var(--slate);text-transform:none;letter-spacing:0;font-weight:400">(choose any)</span></label>
    <div class="chips"><span class="chip on">Focus &amp; ADHD</span><span class="chip">Anxiety &amp; stress</span><span class="chip on">Sleep</span><span class="chip">Emotional regulation</span><span class="chip">School struggles</span><span class="chip">Brain fog</span><span class="chip">Something else</span></div>
    <div class="two"><div><label>Your first name</label><input placeholder="Sarah"></div><div><label>Phone</label><input placeholder="(615) 555-0134"></div></div>
    <div class="two"><div><label>Preferred center</label><select><option>Nashville</option><option>Murfreesboro</option><option>Franklin waitlist</option><option>Concierge / at home</option></select></div><div><label>Best time to call</label><select><option>Mornings</option><option>Afternoons</option><option>Evenings</option></select></div></div>
    <label>In your own words <span style="color:var(--slate);text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label>
    <textarea placeholder="Mornings are hard, homework is a battle, and he's starting to say he's 'just bad at school'…"></textarea>
    <button class="btn btn-primary" style="width:100%;margin-top:28px">Request my conversation</button>
    <p class="micro" style="text-align:center">No payment details, no intake forms today. We never share your information, and there's no obligation after we talk.</p>
  </div>
  <div class="rv">
    <div class="eyebrow">What happens next</div>
    <div class="lens-seq" style="margin-top:22px">
      <div class="row"><div class="n">1</div><div><h4>We call you</h4><p>A real person from your nearest center, at the time you chose — usually within one business day.</p></div></div>
      <div class="row"><div class="n">2</div><div><h4>We listen, then answer</h4><p>What's going on, what you've tried, and every question you have — including the skeptical ones.</p></div></div>
      <div class="row"><div class="n">3</div><div><h4>You decide</h4><p>Book a first visit, think it over, or decide it's not for you. The conversation is free either way.</p></div></div>
    </div>
    <div class="note-sage" style="margin-top:34px">Prefer to talk now? Call <b>(615) 000-0000</b> — a real person answers during business hours.</div>
    <div style="margin-top:26px;font-size:14px;color:var(--slate);line-height:1.8"><b style="color:var(--ink)">Helpful to have ready (not required):</b><br>What a typical hard day looks like &middot; what you've already tried &middot; your schedule for a first visit</div>
  </div>
</div></section>
'''
page('contact.html', 'Talk With Our Team', '', body, cta=False)

# ============================================================ RESOURCES
body = f'''
<section class="page-hero center"><div class="wrap rv">
  <div class="eyebrow">Resources &amp; learning center</div>
  <h1>Understand the brain you live with.</h1>
  <p class="sub" style="max-width:56ch">Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard.</p>
</div></section>

<section class="sec"><div class="wrap">
  <div class="res-grid rv">
    <a class="res-card" href="article.html">{ph('child-session.jpg', 210, '', '60% 30%')}<div class="body"><div class="tag">For parents</div><h3>Homework battles: what's really happening in a stuck brain</h3><p>Why "try harder" backfires — and what helps instead.</p><span class="read">Read →</span></div></a>
    <a class="res-card" href="article.html">{ph('relax.jpg', 210, '', 'center 40%')}<div class="body"><div class="tag">Sleep</div><h3>Why you're exhausted after eight hours of sleep</h3><p>Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.</p><span class="read">Read →</span></div></a>
    <a class="res-card" href="article.html">{ph('glass-head.jpg', 210, '', 'center 40%')}<div class="body"><div class="tag">How it works</div><h3>LENS vs. traditional neurofeedback: an honest comparison</h3><p>Active training vs. passive feedback — and who tends to prefer which.</p><span class="read">Read →</span></div></a>
    <a class="res-card" href="article.html">{plate('Parent and teen talking at kitchen table — candid', 210)}<div class="body"><div class="tag">For parents</div><h3>When a bright kid starts saying "I'm just bad at school"</h3><p>The self-story problem — and how to interrupt it early.</p><span class="read">Read →</span></div></a>
    <a class="res-card" href="article.html">{ph('ear-clip-senior.jpg', 210, '', 'center 45%')}<div class="body"><div class="tag">Adults 55+</div><h3>Brain fog after 55: what's normal, what's worth attention</h3><p>A calm, non-alarmist guide to cognitive change — and when to talk to your doctor.</p><span class="read">Read →</span></div></a>
    <a class="res-card" href="article.html">{ph('lens-device.jpg', 210, '', 'center')}<div class="body"><div class="tag">How it works</div><h3>What the equipment actually does (and doesn't do)</h3><p>A tour of the LENS system — sensors, signals, and safety.</p><span class="read">Read →</span></div></a>
  </div>
</div></section>
'''
page('resources.html', 'Resources', 'res', body)

# ============================================================ ARTICLE TEMPLATE
body = f'''
{crumb(('Resources','resources.html'),('Homework battles',None))}
<section class="sec-tight"><div class="wrap article">
  <div class="rv">
    <div class="eyebrow">For parents &middot; 6 min read</div>
    <h1>Homework battles: what's really happening in a stuck brain</h1>
    <div class="meta">By [Practitioner name] &middot; Reviewed by Sheri [Last name], Clinical Director &middot; [Month Year]</div>
    <p class="lede">Your child is bright. You know it, their teacher knows it — and yet a worksheet that should take twenty minutes just consumed the whole evening and everyone's patience. Here's what's often happening underneath, and why "try harder" tends to make it worse.</p>
  </div>
  {ph('child-session.jpg', 420, 'rv', '60% 30%')}
  <div class="rv">
    <h2>It usually isn't a motivation problem</h2>
    <p>[Body copy — 2–3 paragraphs in plain, non-clinical language. Cite sources where claims are made; keep the no-hype standard.]</p>
    <blockquote>A brain stuck in high alert can't also be a brain that plans, sequences, and follows through. Those systems take turns.</blockquote>
    <h2>What tends to help</h2>
    <p>[Body copy — practical guidance first, LENS mentioned honestly as one gentle option among several, with the standard wellness disclaimer.]</p>
    <div class="note-sage">This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you're concerned about your child, talk with their pediatrician.</div>
  </div>
</div></section>
'''
page('article.html', 'Article', 'res', body,
     cta_args={'h':'Wondering whether this describes your child? Ask us.','sub':'A free conversation with a practitioner — honest answers, no pressure, and a plain "not a fit" if that\u2019s the truth.'})

# ============================================================ WRITE
for fname, html in PAGES.items():
    with open(os.path.join(OUT, fname), 'w') as f:
        f.write(html)
print(f'wrote {len(PAGES)} pages:', ', '.join(sorted(PAGES)))
