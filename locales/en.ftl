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

  There are four departments in <i>one-zero-eight</i>: <b>Tech</b>, <b>Design</b>, <b>Media</b>, and <b>Management</b>. You can read more about us in <a href="https://t.me/one_zero_eight/10">our presentation</a>.

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
-department-description-media = <b><u>Media</u></b> department covers and hosts events, records interviews. If you are a good speaker, photographer or anyone else connected with media — join us to develop your skills!
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
  .q-name = What is your full name? (in English)
  .q-skills = Tell us more about your skills.
  .q-motivation = Why do you want to join our team? What is your motivation?
  .q-time-to-spend = How much time you may spend on one-zero-eight (including meetings, discussions, etc.)?
  .hours-per-week-1-5 = 1-5 hours per week
  .hours-per-week-5-10 = 5-10 hours per week
  .hours-per-week-10-plus = 10+ hours per week
  .q-deadlines = How would you describe your ability to work with deadlines?
  .q-portfolio = Attach your portfolio (paste links in one message).
  .q-learnt-from = How did you know about one-zero-eight?
  .q-select-departments =
    We have four departments at <i>one-zero-eight</i>:

    { -department-description-tech }

    { -department-description-design }

    { -department-description-media }

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

q-tech-1 = What programming experience do you have? Describe the directions you work in (e.g. backend, frontend, hardware), programming languages you know, and technologies you work with.
q-tech-2 = Describe your experience of working in a team. Maybe you've contributed in some open-source projects?
q-tech-3 = Describe your own software/hardware solution to a problem that you are proud of.
q-tech-4 = Send me a link to your GitHub profile. Or any other text, if you don't have one 🤔

q-design-1 = Which directions do you want to work more?
  .ux-ui = UX/UI
  .web = Web design
  .art = Art
  .vector = Vector graphics
  .smm = SMM design
  .photo = Photo editing
q-design-2 = Which programs do you use for designing (e.g. Illustrator, Figma, etc.)?
q-design-3 = Describe your most successful work (you can also attach link to this work). 

q-media-1 = Describe your communication skills.
q-media-2 = What tools and technologies do you use in media projects (mostly content creation)?
q-media-3 = How do you follow news and trends in the media industry?

q-management-1 = What management programs (applications) do you use?
q-management-2 = What management experience do you have?
q-management-3 = How much do you rate your communication skills?
q-management-4 = Describe your soft and hard skills.
q-management-5 = What is successful management for you? Give an example of a successful company from the point of view of management and justify the choice.

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
