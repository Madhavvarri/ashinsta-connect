# Ashinsta Connect

Build a complete, production-ready web application called Ashinsta.

Tagline: “Automate Instagram conversations. Grow engagement.”

I am not an experienced developer, so do NOT give me incomplete code, pseudo-code, placeholders, or instructions that require me to manually finish important functionality.

1. CORE REQUIREMENT

Build the application end-to-end with:

Login

Register

Logout

Protected dashboard

User authentication

Database

Automation rules

Comments management

Activity/history

Settings

Responsive mobile UI

Demo mode

Proper error handling

Loading states

Empty states

Form validation

Secure authentication

Clean reusable components

No broken buttons

No fake UI functionality

Every button and navigation item must actually work.

The application must run successfully with no TypeScript errors, build errors, console errors, or broken routes.

2. TECH STACK

Use:

React

TypeScript

Vite

React Router

Tailwind CSS

Modern component architecture

Supabase for authentication and PostgreSQL database if Supabase integration is available

Use secure environment variables for secrets

Do NOT expose secret keys in frontend code.

Keep the architecture clean so the application can later be deployed through GitHub/Cloudflare.

3. APPLICATION PAGES

Create these routes.

Public

/

Landing page

/login

Login page

/register

Registration page

/forgot-password

Forgot password page

Protected

/dashboard

Main dashboard

/instagram

Instagram connection page

/comments

Comments management

/rules

Automation rules

/activity

Automation activity/history

/analytics

Analytics

/settings

User settings

4. LANDING PAGE

Create a professional SaaS landing page.

Include:

CommentFlow logo/name

Hero section

Clear headline

Description

“Get Started” button

“Login” button

Features section

How it works

Benefits

Simple pricing placeholder section

Footer

Design should look like a real modern SaaS product.

Do not over-design it.

Use a clean professional UI with good spacing and mobile responsiveness.

5. AUTHENTICATION

Implement real authentication.

Register

Fields:

Full name

Email

Password

Confirm password

Validation:

Required fields

Valid email

Minimum password length

Password confirmation must match

After successful registration:

→ redirect to dashboard.

Login

Fields:

Email

Password

Remember me

Include:

Login validation

Loading state

Incorrect credentials error

Successful login redirect

Logout

Logout must actually destroy the authenticated session and redirect to /login.

Protected routes

Unauthenticated users must NOT be able to access:

dashboard

instagram

comments

rules

activity

analytics

settings

If an unauthenticated user attempts to access them:

→ redirect to /login.

Authenticated users should not be unnecessarily redirected back to login.

6. DATABASE

Create the required database schema using Supabase.

Create these tables:

profiles

id

user_id

full_name

email

avatar_url

created_at

updated_at

instagram_accounts

id

user_id

instagram_user_id

username

profile_picture

access_token

token_expires_at

connected

created_at

updated_at

automation_rules

id

user_id

instagram_account_id

keyword

match_type

reply_message

is_active

case_sensitive

cooldown_minutes

created_at

updated_at

comments

id

user_id

instagram_account_id

instagram_comment_id

username

comment_text

post_id

replied

created_at

comment_replies

id

comment_id

rule_id

reply_text

status

error_message

replied_at

created_at

activity_logs

id

user_id

type

message

metadata

created_at

Enable proper Row Level Security.

Users must only be able to access their own records.

7. DASHBOARD

Create a professional dashboard.

Show cards:

Connected Instagram accounts

Total comments

Replies sent

Active automation rules

Success rate

Add recent activity.

Add recent comments.

Add quick actions:

Connect Instagram

Create Rule

View Comments

View Activity

Dashboard must update from database data.

Do not use hardcoded fake statistics when database data is available.

8. INSTAGRAM CONNECTION

Create an Instagram connection page.

Show:

Not connected

Instagram icon

“Connect Instagram” button

Explanation of required permissions

Connected

Show:

Instagram username

Profile picture

Connection status

Connected date

Disconnect button

IMPORTANT:

Use only the official Meta/Instagram APIs.

Do NOT scrape Instagram.

Do NOT ask users for their Instagram password.

Do NOT implement unofficial Instagram APIs.

For the first version, implement a clearly labelled Demo Mode so the complete application can be tested without Meta credentials.

Create the architecture so real Meta OAuth/API integration can be added later without rewriting the application.

9. DEMO MODE

Add:

APP_MODE=demo

When demo mode is enabled:

Allow demo Instagram connection

Generate sample comments

Allow automation rules to be tested

Simulate comment matching

Simulate replies

Record activities

Show clear “Demo Mode” indication

Demo mode must NOT pretend that a real Instagram reply was sent.

Clearly label simulated actions as Demo.

10. AUTOMATION RULES

Create /rules.

User must be able to:

Create rule

Edit rule

Delete rule

Enable/disable rule

View rules

Rule fields:

Keyword

Example:

price

Match type

Options:

Contains

Exact match

Starts with

Ends with

Reply message

Example:

“Thanks for your interest! Please check our profile for more details.”

Case sensitive

Toggle.

Cooldown

Allow user to specify cooldown in minutes.

Active

Toggle.

Rules must be stored in the database.

11. RULE TESTER

Add a “Test Rule” feature.

User enters a sample comment.

Example:

“Can you tell me the price?”

System should show:

Which rule matched

Expected reply

Whether automation would trigger

This must work completely in Demo Mode.

12. COMMENTS

Create /comments.

Display comments in a clean table/card layout.

Fields:

Username

Comment

Post

Date

Status

Reply

Filters:

All

Replied

Not Replied

Search comments.

Clicking a comment should show details.

In Demo Mode, provide sample comments.

13. AUTOMATION ENGINE

Create a reusable automation service.

Flow:

Receive comment

Find active rules

Compare comment against rules

Respect case sensitivity

Respect match type

Check cooldown

Select matching rule

Generate reply

In Demo Mode simulate sending

Store result

Create activity log

Never claim a real Instagram reply was sent unless the official Meta API confirms success.

Handle failures safely.

14. WEBHOOK ARCHITECTURE

Prepare backend architecture for:

GET /api/webhooks/instagram

and

POST /api/webhooks/instagram

GET endpoint should support webhook verification.

POST endpoint should receive Instagram webhook events.

Validate webhook requests.

Process comment events through the automation engine.

For Demo Mode, provide a safe testing mechanism instead of requiring real Instagram webhooks.

15. ACTIVITY PAGE

Create /activity.

Show automation history.

Examples:

Rule created

Rule updated

Rule enabled

Rule disabled

Comment received

Reply simulated

Reply successful

Reply failed

Instagram connected

Instagram disconnected

Add:

Search

Filters

Date/time

Status indicators

16. ANALYTICS

Create /analytics.

Show:

Total comments

Total replies

Successful replies

Failed replies

Reply rate

Active rules

Add simple charts.

Analytics should be calculated from database records.

17. SETTINGS

Create /settings.

Sections:

Profile

Full name

Email

Appearance

Light mode

Dark mode

System

Automation

Default automation status

Notification preference

Account

Logout

Delete account

Delete account must require confirmation.

18. NAVIGATION

Create a responsive sidebar/navigation.

Items:

Dashboard

Instagram

Comments

Automation Rules

Activity

Analytics

Settings

Bottom:

User profile

Logout

On mobile, use a mobile-friendly navigation/menu.

19. UI/UX

Make the application look like a professional SaaS dashboard.

Requirements:

Responsive

Mobile-first

Clean typography

Consistent spacing

Professional cards

Tables

Buttons

Modals

Toast notifications

Loading skeletons

Empty states

Error states

Confirmation dialogs

Use accessible labels and keyboard-friendly controls.

Do not make the interface unnecessarily complicated.

20. ERROR HANDLING

Every API/database operation must handle:

Loading

Success

Failure

Empty data

Network errors

Authentication errors

Show useful user-friendly error messages.

Never expose database errors or secrets directly to users.

21. SECURITY

Implement:

Supabase Row Level Security

User-specific database access

Protected routes

Secure environment variables

No secrets in frontend

Input validation

Safe database queries

Proper authentication state handling

Never store Instagram passwords.

Never scrape Instagram.

Never use unofficial Instagram APIs.

22. PROJECT STRUCTURE

Use a clean structure similar to:

src/ components/ pages/ layouts/ hooks/ services/ lib/ utils/ types/ contexts/

Keep components reusable.

Do not put the entire application inside one file.

23. ENVIRONMENT VARIABLES

Create:

.env.example

Include placeholders for required variables.

Never commit real credentials.

Also create clear configuration for Demo Mode.

24. IMPORTANT: DO NOT FAKE PRODUCTION FEATURES

The application must clearly distinguish:

Demo Mode

Simulated Instagram connection/replies.

Production Mode

Official Meta/Instagram API integration only.

Do not create fake OAuth screens that claim to connect to Instagram.

Do not display “Reply Sent” for a simulated reply without marking it as Demo.

25. TESTING

Before finishing:

Test registration

Test login

Test logout

Test protected routes

Test rule creation

Test rule editing

Test rule deletion

Test enable/disable

Test rule matching

Test comment filtering

Test activity logging

Test dashboard statistics

Test Demo Mode

Test mobile layout

Test error states

Fix all issues you find.

26. BUILD REQUIREMENT

Before considering the task complete:

Run the production build.

Fix ALL:

TypeScript errors

ESLint errors

Build errors

Missing imports

Broken routes

Database errors

Runtime errors

Do not stop after creating only the UI.

The application must be functional.

27. VERY IMPORTANT LOVABLE INSTRUCTION

Do NOT ask me to manually code important parts.

Do NOT give me a tutorial instead of implementing the application.

Do NOT create placeholder buttons.

Do NOT create fake backend functionality.

Do NOT leave TODO comments for core features.

Implement the complete foundation in this project.

If a feature requires credentials that cannot be safely created automatically, implement the correct architecture and Demo Mode, and clearly identify only the credentials/configuration that I must add later.

Prioritize a working application over unnecessary visual effects.

After implementation, give me a concise summary of:

What was built

Database tables created

Authentication implemented

Demo Mode status

Any credentials I need to add

How to run/test the application

Any remaining production-only Meta configuration

Most importantly:

The application must start from Login/Register and work all the way through Dashboard → Instagram → Comments → Rules → Automation → Activity → Analytics → Settings → Logout without broken routes or unfinished core functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ef5bf5a6-cab1-4d11-93e8-0d37b3a4d70b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
