# <div align="left"> <img align="top" width="32" src="public/icon.png"/> TrackPost  </div>

**TrackPost** is a Chrome extension that streamlines cross-border mail tracking and inquiry systems for postal agents within the Universal Postal Union (UPU) and the Kahala Posts Group (KPG).

Postal agents rely on platforms like [GCSS](https://gcss.ipc.be) and [iCare](https://icare.post) to handle inter-agency communications including item location tracking, address alteration requests, and status updates.

## The Problem
To raise an inquiry, agents had to fill out a form each time, providing details about the item's contents, sender, and recipient. While basic information was auto-filled, the missing fields still had to be manually copied, pasted, and verified by the agent. This repetitive and error-prone process left clear room for improvement.

## The Solution
#### Version 1: A Desktop Application
I initially built a Windows desktop application in C#, the language I was comfortable with at the time. It collected and displayed the information needed for the form, and clicking an entry copied it to the clipboard while the app stayed on top. This worked, but it still required the agent to switch windows and interact with a separate tool.

#### Version 2: From Desktop to Browser
Learning that a browser-native tool could achieve full end-to-end automation, I transitioned the project to a Chrome extension. This allowed direct DOM manipulation and background script integration to fetch, parse, and auto-fill missing fields directly inside GCSS and iCare forms without requiring manual agent intervention.

With this transition, I was able to further develop features like notification/reminder of unread replies or new inquiries, auto calculation of currencies, and adding/modifying HTML elements for more convenience.

#### Why TypeScript and React
Coming from a strongly-typed background in C#, TypeScript was a natural fit as it gave me type safety and the same compile-time confidence I was used to. For the view layer, I chose React because of its widespread adoption in the frontend ecosystem and its component-based model, which suited the modular structure of a browser extension well. My goal for this project was beyond shipping a working tool: I wanted to deepen my understanding of modern frontend engineering, and both choices deliberately supported that growth.

## Implementation Details
While researching our [Korea Post website](http://epost.go.kr), I noticed that the page where customers file an investigation request sends an HTTP POST request via AJAX fill the item's data. The only input required was the tracking number, which was ideal since inquiries are always raised against a tracking number. This discovery became the foundation of the auto-fill feature.

Korea Post later added the sender's phone number as an additional check, but because it was enforced only in the front-end layer rather than the back end, the endpoint still returned a response without requiring the phone number.

For the notification feature, I had to poll the inquiry systems (GCSS and iCare) for unread replies and new requests using HTTP POST requests. While getting a response from GCSS was straightforward, iCare's backend required a valid CSRF token and refused to return the data without one.

This led me to study how the token was generated on the site's front-end layer. I learned that when the page is first loaded, the server provides a CSRF token, and each subsequent response returns a new token to be used in the next request. At first I tried sending a fabricated token, but the server rejected it outright, giving me only an error response or a redirect to the homepage. I then discovered that if I sent a genuine but expired CSRF token, the server would respond by issuing a new, valid one. From there I could re-submit the request with the fresh token, and it worked.

In the source files, you'll notice separate scripts for the old and new versions of GCSS. This is because GCSS migrated to a new platform, and the change was so significant that I had to rebuild the GCSS portion from scratch.

## Maintenance
For distributing updates, I first built a console updater app in C#, the source code for which you can find [here](https://github.com/psh0626/TrackPostExtUpdatorProject). However, this approach was unintuitive, as it had to be registered in the start-up programs and would also replace the existing extension source folder with a new version. This introduced errors unrelated to the main program, resulting in some users getting stuck with an outdated version.

Later, I learned that Chrome extensions for enterprises use Group Policies for distribution. So I decided to adopt that approach because with Group Policies, the browser itself now checks for updates and downloads it behind the scences, which is a smoother operation.

I also gained more control over each user's browser settings. For example, my [batch file](https://github.com/psh0626/TrackPostExtZip/blob/main/TrackPost-install.bat) writes Group Policy settings into the registry to keep the extension pinned to the browser toolbar and to add GCSS and iCare to Chrome's "Always keep these sites active" list.

I also automated the update pipeline (uploading releases to GitHub), which you can find in the [publish-release](/publish-release/) folder. This made shipping new updates far more convenient and, as a side benefit, ensured that update notes were written with every release rather than being skipped.


## Folder structure

This project is organized around the Chrome extension runtime model: the extension has a background worker, page-level scripts that run in the target web app, and a shared layer that both sides use.

- [src/background-service](src/background-service)  
  Handles the extension's background lifecycle, service worker behavior, notification logic, storage access, and popup/options UI. This is the part that runs outside the web page and coordinates long-running tasks.

- [src/content-scripts](src/content-scripts)  
  Contains scripts injected into GCSS/iCare pages. These files interact with the DOM, detect the current page state, read data from the page, and automate repetitive form-filling or UI actions.

- [src/common](src/common)  
  This is the shared middle layer between the two environments. It includes utilities, storage keys, message contracts, shared types, and logic that both the background service and the content scripts rely on.

- [src/background-service/ui](src/background-service/ui)  
  React-based UI for extension surfaces such as the popup, side panel, and options page.

- [src/background-service/lib](src/background-service/lib)  
  Supporting background logic such as notification helpers, popup fetching, and extension service utilities.

- [src/content-scripts/inject-dom](src/content-scripts/inject-dom)  
  DOM injection helpers that add custom UI or overlays into the target pages without needing to rebuild the entire page.

- [public](public)  
  Static assets used by the extension, such as icons and fonts.

- [publish](publish)  
  Build and packaging-related files for producing the extension package.

- [publish-release](publish-release)  
  Release automation and update-related scripts for publishing versions and generating release notes.

#### The reason for this structure

The separation is intended because Chrome extensions run in different execution contexts:

- Background code is responsible for lifecycle, notifications, polling, and coordination.
- Content scripts run inside the web page and interact with the DOM.
- The shared layer keeps common logic in one place so both sides can use the same message formats, utilities, and data definitions.

This makes the architecture easier for me to maintain as page-specific automation stays in the content side, extension-level coordination stays in the background side, and shared logic lives in the middle layer rather than being duplicated across both environments.


## Screenshots
### Popup UI

<img width="394" align="top" alt="image" src="https://github.com/user-attachments/assets/e6d02ac7-7d31-46fc-98d5-04eb1735c63a" />
<img width="389" alt="image" src="https://github.com/user-attachments/assets/af2d252f-f803-4d5d-9936-251ad7c498ec" />

## Sidepanel

<img height="600" alt="image" src="https://github.com/user-attachments/assets/b9c96e91-16b8-466d-8324-f6d664302290" />

## Options Page

<img width="408" alt="optionsPage" src="https://github.com/user-attachments/assets/bad6941f-f444-47d6-ad58-0d18d4b960ad" />
<img width="334" align="top" alt="image" src="https://github.com/user-attachments/assets/1c046255-725a-4cac-9ab0-497804060641" />
<img width="408" alt="image" src="https://github.com/user-attachments/assets/c846d4b1-88ee-4f02-84fe-5e5fa5225d9d" />
<img width="408" align="top" alt="image" src="https://github.com/user-attachments/assets/6be6e7b2-1852-420c-9d7d-142bc827c40d" />


## Windows Notification

<img width="445" height="279" alt="image" src="https://github.com/user-attachments/assets/8cb8bb70-8d54-4da7-93b1-ac6479e852f5" />
