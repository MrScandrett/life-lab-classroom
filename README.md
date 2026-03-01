# Life Lab Classroom Site

An interactive classroom website for exploring Conway's Game of Life:

- Beginner, Intermediate, and Advanced simulation levels
- Multiple rule sets (`B3/S23`, `B36/S23`, `B2/S`)
- Pattern placement (Glider, LWSS, Pulsar, Gosper Glider Gun)
- History timeline and future applications section

## Local Development

To run the simulation locally, simply open the `index.html` file in your web browser.

## Publish to GitHub Pages (`MrScandrett` account)

## 1) Create a new repository on GitHub

On [GitHub](https://github.com), create a new repo, for example:

- `life-lab-classroom`

Do not initialize it with a README (this project already has one).

## 2) Push this project from your terminal

Run these commands in this folder:

```bash
git init
git add .
git commit -m "Create Life Lab classroom website"
git branch -M main
git remote add origin https://github.com/MrScandrett/life-lab-classroom.git
git push -u origin main
```

## 3) Turn on GitHub Pages

1. Open your new repository on GitHub.
2. Go to `Settings` -> `Pages`.
3. Under "Build and deployment":
   - `Source`: "Deploy from a branch"
   - `Branch`: `main` and `/ (root)`
4. Save.

Your site will be published at:

- `https://mrscandrett.github.io/life-lab-classroom/`

(Usually live in 1-3 minutes.)
