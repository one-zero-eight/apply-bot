## Commands

cmd_start-member-active =
  Hi, { $name }! Here is what Ozzy can do for you:
  /profile — show your profile
  /help — show help message

cmd_start-member-inactive =
  Hello, { $name }! I'm Ozzy and I don't know how I can help you for now, unfortunately.

cmd_start-candidate =
  Hi, { $name }! It's Ozzy 👋
  I'm official bot of <i>one-zero-eight</i> team.

  You can find more information about us from <a href="https://t.me/one_zero_eight/10">our presentation</a>.

  By the way, guys from the team are processing your application.
  I'm looking forward to you joining us, too! So let's wait together ⏳

cmd_start-unknown =
  Hi, my name is Ozzy 👋
  I'm official <i>one-zero-eight</i>'s bot.

  I guess you want to join our team if you texted me?

want-to-108-yes =
  Let me shortly explain what <i>one-zero-eight</i> is.
      
  <b><i>one-zero-eight</i></b> — is a community of enthusiastic individuals with a common mission — make life at Innopolis University better. We aim to improve our skills and networking, create projects, and just enjoy the process.

  There are three departments in <i>one-zero-eight</i>: <b>Tech</b>, <b>Design</b> and <b>Management</b>. You can read more about us in <a href="https://t.me/one_zero_eight/10">our presentation</a>.

  We welcome everyone, who has something valuable to contribute and who is ready to grow with us. Is it about you? Then we're waiting for you! Click the button (or send me /apply), when you're ready to answer some questions and join us.

want-to-108-no = Ok, have a nice day! Send /start if you change your decision.

cmd_help-member-active =
  Here is a list of commands:
  /profile — show your profile
  /help — show this message

cmd_help-member-inactive = Unfortunately, I don't know how can I help you for now.

cmd_help-candidate =
  So far, I've done everything in my power to help you join us. 
  Let's wait until your application is checked.

cmd_help-unknown =
  It's Ozzy! Here is what I can do for you:
  /help — show this message
  /start — help you join us

cmd_profile =
  Here is your profile:

  <b>Name:</b> { $name }
  <b>Role:</b> { $role }
  <b>Speaking languages:</b> { $langs }

  Member since { $date }.

cmd_unknown = Sorry, but I don't know this command 🫤


## Common

ok = Okay 👌
yes = Yes
no = No
i-want-to-108 = 🙋 I want to one-zero-eight!
wait-a-second = Just a second.

fallback-callback-query-msg-1 = Button's stuck!
fallback-callback-query-msg-2 = Ship's sailed.
fallback-callback-query-msg-3 = too late... ⏱️

## Conversations

-candidate-application-cnv-rules =
  » you can /pause the conversation at any moment and continue later;
  » you can /undo the last answer to go one step back;
  » I will ignore other commands during the conversation;
  » I will ignore formatting, so "<del><b>some</b> <i>text</i></del>" for me is just "some text";
  » I will ignore files, photos, stickers, etc.
  » you can review all your answers in the end.

-department-description-tech = <b><u>Tech</u></b> department develops software and hardware projects, creates websites and bots. We welcome people interested in great projects and elegant software solutions!
-department-description-design = <b><u>Design</u></b> department takes care of all design stuff from tech projects to media posts and banners, draws beautiful arts, develops convenient UI's, and edits photos. We welcome everyone who love aesthetics!
-department-description-management = <b><u>Management</u></b> department connects other departments, communicates with influential people outside the team, and manages events. If you like to create tables in “to-do” apps, you are welcome!

cnv_candidate-application =
  .already-member = You're already among us! You can even see your /profile.
  .already-applied = It seems like we already have your application.
  .already-applying = <i>that's what we're doing right now...</i>
  .error = ⚠️ Oops! Something bad just happened. Try to /apply again, or contact us.
  .begin =
    I'm happy to know you want to join our team!

    But before you do, we need to know something about you. I will ask you several questions and then will send your application to responsible people in our team.

    <b>Please, note that:</b>
    { -candidate-application-cnv-rules }

    Are you ready?
  .begin-returned =
    I remember your answers. Let's continue the conversation.

    <b>Let me remind the rules:</b>
    { -candidate-application-cnv-rules }

    Are you ready?
  .begin-cancelled = No problem, come back later and /apply, when you're ready. I'll wait.
  .stopped-answers-saved =
    I remembered your answers.

    Come back later and /apply when you're ready to continue. But not that long, or I might forget you!
  .cannot-go-back = <i>cannot go back from here</i>
  .cannot-use-command = <i>/pause the conversation to use commands</i>
  .btn_begin-go = Let's go!
  .btn_begin-cancel = Not now.
  .q-name = Your name and surname in English.
  .q-age-study = How old are you? What year of study are you in? University or college?
  .q-learnt-from = How did you hear about one-zero-eight?
  .q-projects = Describe which one-zero-eight projects and activities you are familiar with. Which of our projects do you use?
  .q-motivation = What is your motivation for joining one-zero-eight team? Do you already know what you would like to work on?
  .q-time-to-spend = How much time are you ready to dedicate to the team?
  .hours-per-week-1-5 = 1-5 hours per week
  .hours-per-week-5-10 = 5-10 hours per week
  .hours-per-week-10-plus = 10+ hours per week
  .q-github-resume-social = Send a link to your GitHub. Also attach your resume, if you have one, and links to any of your social media profiles that may be relevant to us.
  .q-select-departments =
    We have three departments at <i>one-zero-eight</i>:

    { -department-description-tech }

    { -department-description-design }

    { -department-description-management }

    Please, select those you're more interested in.
  .departments-selected = You're interested in <b>{ $deps }</b>. { $n ->
    [one] This department
    *[other] These departments
  } gave me a list of questions to know more about you. Let me now ask these questions.
  .department-question-header = <b>{ $dep } — Question { $qNo }/{ $total }</b>
  .almost-done-after-departments-questions =
    Thank you for the detailed answers to the departments questions.

    We're almost done. { $questionsRemain ->
      [one] And the last question!
      *[other] Last { $questionsRemain } simple questions.
    }
  .summary =
    Here is your application:
    _________________________

    { $application }

    _________________________

    📝 Please, check everything and confirm submission.
  .btn_submit-application = Submit ✅
  .btn_review-application = Review 👀
  .submitted =
    Your application has been successfully submitted! 🥳

    We will contact you as soon as we can.
    Stay tuned.
  .submission-error =
    Sorry, but something went wrong. Application submission failed. 😔

    Try to /apply again later, or contact us.

## Questions

departments-qa = Departments Q&amp;A

q-tech-1 = Describe the areas in which you have experience (backend, frontend, DevOps), the programming languages you know, and the technologies you have worked with.
q-tech-2 = Describe software/hardware solutions you are proud of.
q-tech-3 = Do you have experience working in a team? Are you able to meet deadlines?

q-design-1 = What areas have you worked in? (e.g. illustrations, digital design, web design, or 3D modeling)
  .ux-ui = UX/UI
  .web = Web design
  .art = Art
  .vector = Vector graphics
  .smm = SMM design
  .photo = Photo editing
q-design-2 = What experience do you have in design? (e.g. posters, websites, or merch) If you do not have experience, tell us what you are interested in.
q-design-3 = Which design tools have you used? (e.g. Figma, Illustrator)
q-design-4 = Share links to your work.

q-management-1 = Have you worked in IT teams? In which roles, and what were you responsible for? (e.g. analytics, frontend, backend, or product management)
q-management-2 = Are you familiar with GitHub and issue management?
q-management-3 = Do you have presentation skills? Have you created presentations yourself?
q-management-4 = Have you worked with text? Are you interested in writing posts?

question-keep-saved = Or /keep the saved answer:
  <i>{ $saved }</i>
question-multi-select =
  .btn_select-at-least-n = { $n ->
    [one] Select at least one
    *[other] Select at least { $n }
  }
  .btn_confirm = Confirm
question-selected-none = <i>nothing</i>
question-selected = You selected: <b>{ $selected }</b>.
question-answer-too-long = <i>try to make it no longer than { $limit } characters (now it's { $current })</i>
