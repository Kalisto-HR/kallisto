# Rules for working at the Kallisto repository

**1. Coding Guidelines**

1.1 It is a monorepository, so whatever microservice/project concerning Kallisto you wanna add, add here. \
1.2 Use camelCase for Golang (PasCal for only public variables/methods); that is how the conventions are set. \
1.3 Write concise logic, test, and question everything. \
1.4 Do not cuddle everything or abuse newlines; try to be clean as if it is a USSR handwriting class. \
1.5 If you are using concurrency, always know that channels > mutex; that is just the Golang way of doing asynchronous code. \
1.6 Place everything under proper hierarchy or namespaces. \
1.7 Use generics as much as you know, and always prefer flexibility to avoid future legacy issues. \
1.8 IMPORTANT: No direct merges to the main repository; everyone makes their branch, adds their features, and opens a merge request, which the team will review and approve/suggest changes. \
1.9 Maintain proper documentation. \
1.10 Escort every sensitive adjustment with proper testing; otherwise, I will not approve the Pull Request.

**2. Pull Request Guidelines**

2.1 In the title, first say what you're doing (refactor, feat, fix, bug, typo), followed by the domain of the changes. Like: `feat merge_sort:` — after the colon, describe the changes.
e.g., `feat merge_sort: enabling custom data_types` \
2.2 Write meaningful commit messages — nothing like `"shit, should've fixed"` will be accepted. \

**3. AI Guidelines**

3.1 Do not litter the holy repository with AI trash unless you're 100% sure of what is happening there. \
3.2 Only use AI as a search engine, not a code generator; it may hallucinate, and if we accept such a change, we may get fucked later. \
3.3 Use Cursor if you want to generate code with AI.

---
