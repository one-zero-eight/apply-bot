## Commands

start-cmd = Hi👋

  I'm official <i>one-zero-eight</i>'s bot.

help-cmd = Here is what I can do:
  /help - show this message
  /start - show welcome message
  /apply - fill out an application to join our team

profile-cmd = Here is your profile:

  <b>Name:</b> { $name }
  <b>Role:</b> { $role }
  <b>Speaking languages:</b> { $langs }

  Member since { $date }.

unknown-cmd = Sorry, but I don't know this command.

## Conversations

candidate-application-cnv =
  .already-member = You're already among us! You can even see your /profile.
  .already-applied = It seems like we already have your application.
  .error = ⚠️ Oops! Something bad just happened. Try to /apply again, or contact us.
  .any-command = <i>/pause the conversation to use commands</i>
  .begin = I'm happy to know you want to join our team!

    But before you do, we need to know something about you. I'll ask you several questions and then send your application to responsible people in our team.

    <b>Note that:</b>
    - during the conversation you can send me /stop, /cancel or /pause to pause the process and continue later;

    - at the end you'll be able to modify your answers, so just proceed further, if you've made a mistake;

    - formatting of your messages won't be preserved (i.e. "<del>my text</del>" will be recorded as "my text").

    Let's begin!
  .continue = Let's continue filling out the application.

    So, where were we...
  .canceled = I remembered your answers.

    Come back later and /apply when you're ready to continue. But not that long, or I might forget you!
  .choose-departments = In <i>one-zero-eight</i> we have four departments:

    <b>Tech</b>
    You want to create technological solutions to a variety of problems. Or maybe you just like pushing buttons?

    <b>Design</b>
    Do you like to create beautiful designs? Or you want to create user-friendly interfaces? You are very welcome to join us.

    <b>Media</b>
    Are you a good speaker? Maybe photographer? Or anyone else connected with media? Join us to develop your skills.

    <b>Management</b>
    Do you want to communicate with influential people, or manage our work? Or do you just like to create tables in "to-do" apps? So, welcome to us.

    Please, choose those you're more interested in:
  .confirm-deps-choice-btn = Confirm
  .choose-at-least-one-dep-btn = Choose at least one
  .deps-chosen = You've chosen: <u>{ $chosen }</u>. { $n ->
    [one] This department
    *[other] These departments
  } gave me a list of questions to know more about you. Let me now ask these questions.
  .deps-chosen-short = You've chosen: <u>{ $chosen }</u>.
  .ok-btn = Okay
  .dep-question = <b>{ $dep } — Question { $qNo }/{ $total }</b>
  .thanks-for-answering-deps-questions = Thank you for the detailed answers to the departments questions.
  .n-questions-remain = We're almost done. { $n ->
      [one] And the last question!
      *[other] Last { $n } questions.
    }
  .ask-full-name = What is your full name?
  .ask-skills = Tell us more about your skills.
  .ask-motivation = Why do you want to join our team? What is your motivation?
  .ask-where-knew = How did you know about <i>one-zero-eight</i>?
  .confirmation = Here is your application:

    <b>Full name:</b> { $fullName }

    <b>Skills</b>
    <i>{ $skills }</i>

    <b>Departaments</b>
    { $departments }

    <b>Why do you want to join?</b>
    <i>{ $motivation }</i>

    <b>Where did you know about us?</b>
    <i>{ $whereKnew }</i>

    Check everything and confirm submission.
  .edit-apply-btn = Edit 📝
  .confirm-apply-btn = Submit ✅
  .submitted = Your application has been successfully submitted 🎉

    We'll contact you as soon as we can. Stay tuned!
  .submission-error = 😔 Sorry, but something went wrong. Application submission failed. Try to /apply again later, or contact us.

### Candidate application departments questions
q-tech-1 = What programming experience do you have?	
q-tech-2 = What about cust-dev or system analytics?	
q-tech-3 = Describe your own software/hardware solution to a problem that you are proud of.

q-design-1 = Which directions do you want to work more?	
q-design-2 = Which programs do you use for designing?

  e.g. Illustrator, Figma, etc.
q-design-3 = Send links to your works (you can create one document or paste links in one message)	

q-media-1 = What position do you want to take in media?	
q-media-2 = How much time you may spend on media?
q-media-2__1-5-hours-per-week = 1-5 hours per week
q-media-2__5-10-hours-per-week = 5-10 hours per week
q-media-2__10-more-hours-per-week = 10+ hours per week

q-media-3 = Paste a link to your media-portfolio.	

q-management-1 = What management applications do you use?	
q-management-2 = What management experience do you have?	
q-management-3 = How much do you rate your communication skills?	
q-management-4 = Describe your soft/hard skills.
q-management-5 = What is successful management for you?

  Give an example of a successful company from the point of view of management and justify the choice.


question-keep-old = Or /keep the previous answer:
  <i>{ $old }</i>
