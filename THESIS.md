# THESIS

```
NAME:       Sightglass
MOMENT:     The duty engineer at 21:40, an hour before the engine room goes unmanned for the night,
            walking every space to read every local gauge, a torch in one hand and a rag in the other.
ACTION:     Each gauge the engineer looks at is read from that view and checked against its limits.
            The engineer accepts it, corrects it, or reads it by eye, then signs READY or HOLD.
            The chief engineer countersigns the sheet.
DISCOVERY:  It is easy to assume an AI that sees what you see can read a dial. In published tests it
            often cannot: the usual failure is placing the needle. So here the model only points at
            the needle and the scale, and code computes the value. On SPECS the camera frame also
            contains the Lens's own overlay, so the Lens hides it for the one frame it captures.
PROOF:      Measured on 200 real dial photos chosen before the run: accuracy when the model is asked
            to read, against accuracy when it is asked to point; wrong answers that would reach a
            person; readable dials refused. Numbers come from docs/FACTS.json and are filled in once
            the evaluation has run. Until then this line states no figures.
```
