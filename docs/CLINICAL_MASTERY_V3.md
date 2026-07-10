# Case 001 Clinical Mastery v3

## Purpose

This rebuild responds to a product and clinical usability failure in the first prototype. The previous broad category-reveal interaction did not model a real consultation, did not connect question wording to the answer obtained, and produced a Review with insufficient clinical leverage.

Version 3 rebuilds the vertical slice around a reproducible clinical road:

1. Define the symptom in the patient's words.
2. Find associated warning features.
3. Check selected dangerous alternatives.
4. Establish relevant background risk.
5. State the action threshold before diagnostic certainty.
6. Request immediate observations, focused examination and ECG without delaying transfer.
7. Explain concern with calibrated uncertainty.
8. Discuss the immediate plan.
9. Manage resistance to ambulance transfer.
10. Deliver a focused handover.

## Learner interaction

The live Station presents one clinical task at a time. Each history task contains:

- the purpose of the question
- one suggested question to say aloud
- one patient response
- what the response adds
- why it matters clinically

The learner does not type. Normal navigation is removed during the live attempt. An encounter trace externalises what has already been established. The exact plan gate, `I have discussed my plan`, remains in place, and `Response to your plan` remains separately hidden until that gate is used.

## Review interaction

The previous generic Self-check, What changed and redundant What-if stages are replaced by seven clinically productive stages:

1. Clinical synthesis
2. Question → answer → meaning
3. Act before proof
4. Patient explanation
5. Handover drill
6. One repair
7. Next action

Review remains locked until Finish station. It is loaded lazily only after the attempt is locked. One stage is available by default, and one main stage is rendered at a time.

## Cognitive-load position

The learner-facing product does not use diagnostic labels about the learner. The design nevertheless applies the following attention-support principles:

- one cognitive unit per screen
- visible current task and consultation road
- short spoken retrieval rather than required typing
- clinical meaning attached immediately to the information obtained
- one selected repair rather than a global performance report
- clear resumption after interruption
- route changes reset scroll position on mobile
- no badges, points, streaks, rewards or celebratory effects

## Clinical boundaries

The implementation teaches recognition and emergency escalation for a high-risk acute chest discomfort pattern. It does not add medication content. Local emergency pathways and clinical judgement remain authoritative.

Clinical release, source review, medication content, audio release and product release remain **HOLD**.
