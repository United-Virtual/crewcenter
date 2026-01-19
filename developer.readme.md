# CrewCenter Developer Workflow

To ensure a consistent development process and avoid potential conflicts, all developers should follow this workflow.  

> **Note:** AWS Lightsail has limited resources, so building Docker images directly on the server is slow. Developers should build locally and deploy images instead.

---

## Workflow Steps

### 1. Update Your Local Source Code

Pull the latest changes from the official repository:

```bash
git pull https://github.com/United-Virtual/crewcenter.git
```

> **Note:** Always make sure your local branch is up-to-date before starting new work to prevent merge conflicts.

### 2. Make Your Code Changes

* Edit the source code as needed.
* Follow project coding standards and conventions.
* Keep commits focused and descriptive.

### 3. Test Changes Locally

Before committing:

* Run the application locally to verify that your changes work as expected.
* Use Docker or Node local development commands to confirm functionality.

### 4. Commit and Push Changes

Once your code works:

```bash
git add .
git commit -m "Describe your changes here"
git push
```

* Resolve any merge conflicts if any emerged from the push operation.

### 5. Build a New Docker Image

Create a new Docker image locally to avoid slow Docker builds on Lightsail.

```
make build
```

### 6. Upload the Docker Image to the Repository

* first, you need a token for ghcr.io and add it to your .env file (see below steps)

```
make login
make upload
```

* This uploads the new image to the ghcr.io container repository.
* Lightsail instances can then pull and run the updated image efficiently.

---

✅ Best Practices Summary

* Always pull before you edit.
* Test locally before committing.
* Resolve Git conflicts immediately to maintain a clean code base.

## Create Token for ghcr.io

* Go to: https://github.com/settings/developers
  * You must be logged in to GitHub.
* You’ll see sections like:
  * `Personal access tokens`
  * `OAuth Apps`
  * `GitHub Apps`
* Create a Personal Access Token (PAT)
  * Go to `Developer settings`
  * Click `Personal access tokens`
  * Choose `Tokens (classic)` (recommended for Docker)
  * Click `Generate new token`
  * Required scopes
    ✔ write:packages
    ✔ read:packages
* add it to your .env file
```
GHCR_USERNAME=your_username
GHCR_TOKEN=your_token  
```