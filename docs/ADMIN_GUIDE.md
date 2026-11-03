# Your website: a guide for Kalpana

This guide shows you how to look after your website yourself. You do not need to know anything technical. Take it one step at a time. Nothing here can break the site permanently, and the computer asks you to confirm before it deletes anything.

## Two important things to know first

1. **The website does not take payments.** When a customer "places an order", no money moves. The order simply arrives in your admin area, and the painting is held for them. You (or your team) contact the customer, agree how they will pay, and when the money has really arrived you mark the order as **Paid** yourself.
2. **The website does not send any emails.** Customers do not get an automatic email, and you do not get an email when someone orders or writes to you. **You need to open the admin area regularly** (once or twice a day while orders are coming in) to see new orders and messages. The customer's email address and phone number are shown on each order so you can contact them yourself.

## Opening the admin area

1. In your web browser, go to your website address and add `/admin` at the end (for example `https://yourwebsite.com/admin`).
2. Type your email and password, then press the sign-in button.
3. When you are finished, press **Log out** at the bottom of the left-hand menu (on a phone, press **Menu** first). You are also signed out automatically after about 8 hours.

If you type the wrong password several times in a row, the site makes you wait a while before you can try again. Wait and try again later.

The left-hand menu has these places:

| Menu item | What it is for |
|---|---|
| Dashboard | A quick summary: orders, paintings, messages |
| Artworks | Your paintings |
| Poems | Your poems |
| Orders | Orders from customers |
| Enquiries | Messages: general questions, custom-painting requests, newsletter sign-ups |
| Site content | The words on the website |
| Media library | The photos you have uploaded |
| Settings | Shipping price, pausing the shop |
| Audit log | A record of what was changed and when |
| Account | Change your password |

Tip: if you have typed something and not saved it, the page warns you before you leave. Always press the **Save** button when you are done.

---

## How to add a painting

1. Click **Artworks** in the menu, then the **Add artwork** button.
2. Fill in **Details**:
   * **Title**: the name of the painting. (The "Slug (web address)" box fills itself in from the title. Leave it alone. **It cannot be changed after you save**, so make sure the title is right before saving the first time.)
   * **Type**: choose **Original** for a one-of-a-kind painting, or **Print** for copies that can be sold again.
   * **Dispatch time**: for example `5-7 days`.
   * **Medium**: for example "Acrylic on canvas".
   * **Dimensions**: for example `60 x 90 cm`.
   * **Description**: a few lines about the painting.
3. Fill in **Price and availability**:
   * **Price**: type the price in rupees, numbers only (for example `12000`).
   * Or tick **On enquiry (no fixed price)**. The website then shows "On enquiry" and buyers must contact you.
   * If the type is **Print**, an extra box appears: **Print variants**. Press **Add variant** for each size or option, give it a name (like "A3") and its price. A print needs at least one variant.
   * **Available to buy**: tick this if it can be bought now. Untick it if it is already sold or you are not selling it.
   * **Published on the website**: tick this to show it on the website. Untick it to keep it as a hidden draft.
4. Add the **Image**:
   * Press **Choose or upload image**. A window opens. Pick a photo you uploaded before, or upload a new one from your computer.
   * Photos can be JPEG, PNG, WebP or AVIF, up to 8 MB. A photo about 2000 pixels on its longest side is plenty, ideally under 1 MB; very large photos make the website slower.
   * **Image alt text**: write one short sentence describing the painting, for people who cannot see it (for example "A village lane with trees at sunset").
   * **Aspect ratio**: this is the shape of the painting (width divided by height). Easiest way: after you choose the image, press **Set ratio from image**. Otherwise, type the width and height into the **Width** and **Height** boxes and press **Calculate ratio**.
5. Optional: under **Related poem**, pick one of your poems to show with this painting.
6. Press **Create artwork** at the bottom. A green message confirms it is saved.

Within about a minute the painting appears on the website.

**Changing a painting later:** in **Artworks**, press **Edit** next to it, change what you need, press **Save changes**.

**Hiding a painting without deleting it:** open it and untick **Published on the website**.

**Changing the order of paintings:** in the **Artworks** list, use the **Up** and **Down** buttons. The order shown here is the order on the website.

**Deleting a painting:** press **Delete** and confirm. It disappears from the website and this cannot be undone. Orders already placed keep their own record of what was bought.

**Marking an original as sold (without an order):** edit the painting and untick **Available to buy**.

---

## How to add a poem

1. Click **Poems**, then **Add poem**.
2. Fill in:
   * **Title**.
   * **Language**: English or Marathi.
   * **Theme**: one or two words (optional).
   * **Poem text**: type or paste the poem. Every new line you type is kept as a new line on the website. A preview on the right shows how it will look.
   * **Published on the website**: tick to show it; untick to keep it hidden.
3. Press **Create poem**.

Like paintings, the web address (slug) is fixed after the first save. You can reorder poems with **Up** and **Down**, and edit or delete them from the **Poems** list. A poem that is attached to a painting cannot be deleted until you remove it from that painting first (the site will tell you if so).

---

## How to handle an order

1. Click **Orders**. New orders show **Pending payment**. You can filter by status or search by order number, customer name, email or phone.
2. Click the order number to open it. You will see the customer's name, email, phone, delivery address, the items and the total.
3. **Contact the customer** (email or phone) and agree how they will pay. The website will not do this for you, so please do it promptly.
4. When the money has arrived, open the order, choose **Paid** under "Change status to", and press **Update status**.
5. When you have posted the painting, change the status to **Dispatched**. Under **Notes**, type the courier name and tracking number in the **Tracking note** box and press **Save notes**. The customer can see the tracking note if they use the website's "Track an order" page with their order number and email.
6. When it arrives, change the status to **Delivered**.
7. Use the **Internal note** box for private reminders. Only you can see it.
8. **Print packing slip** (top of the order page) prints the delivery address and items for the parcel.

The five statuses are: Pending payment, Paid, Dispatched, Delivered, Cancelled.

**If an order is not going to be paid:** change the status to **Cancelled** and confirm. Any original painting in it goes back on sale automatically. The customer is not told automatically, so let them know yourself if needed. If you change your mind, you can reopen a cancelled order, but only if the painting has not been sold to someone else in the meantime.

**Unpaid orders cancel themselves.** In **Settings**, "Cancel unpaid orders after (hours)" is set to 48 unless you change it. If a customer does not pay in that time, the order is cancelled and the original painting goes back on sale. Put `0` to turn this off.

---

## Messages and newsletter sign-ups (Enquiries)

Click **Enquiries**. There are three tabs:

* **General**: questions from the Contact page.
* **Custom art**: commission requests (style, size and budget are shown).
* **Newsletter**: email addresses of people who signed up.

For the first two, reply to the person yourself using their email address, then tick **Handled** so you can tell what is still new. Use the **Show** box to see only "Not handled" messages. **Delete** removes one permanently.

On the **Newsletter** tab, **Export CSV** downloads the list of email addresses as a file you can open in Excel. The website does not send newsletters itself; you would use the list with another service.

---

## How to change the words on the website

1. Click **Site content**.
2. The page is split into groups (Site-wide, Home, Gallery, Poetry, About, Checkout, Pages). The links at the top jump to each group.
3. Find the text you want to change and type in the box. Some boxes are lists (for example the FAQs or the three pillars on the home page): use **Add item**, **Up**, **Down** and **Remove** inside them.
4. Boxes you have changed show **Unsaved**. When ready, press the **Save ... changes** button at the bottom of the page. A message tells you the website now shows your changes (it may take up to a minute to appear for visitors).
5. Changed your mind? **Discard changes** throws away everything you have not saved yet. For a box you saved earlier (marked **Edited**), **Reset to default** brings back the original wording.

Please replace the "Placeholder" texts before the site is launched, especially the Privacy policy, Terms, and Shipping and returns pages. Plain text only: web formatting codes are not understood.

The "Checkout" group holds the sentences customers read about payment and order confirmation. Keep them honest: they should match how you really take payment (for example, that you will contact them), and they should not promise an email unless emails are actually being sent.

---

## Pausing the shop (turn checkout off)

Use this when you are away or cannot post orders.

1. Click **Settings**.
2. Under **Checkout**, untick **Checkout is enabled**.
3. Press **Save settings** and confirm.

While this is off, nobody can place an order on the website. People can still look at paintings, poems and send messages, and orders already placed are not affected. To open again, tick the box and save.

In the same page you can change:

* **Flat shipping charge**: the shipping price added to each order.
* **Free shipping above**: orders whose items total this amount or more have no shipping charge.
* **Cancel unpaid orders after (hours)**: see "How to handle an order".

---

## Your photos (Media library)

**Media library** shows every photo you have uploaded. You can upload more, edit the description (alt text) of a photo, and delete photos. A photo that is used by a painting cannot be deleted; first change that painting's image. Deleted photos are removed for good.

---

## How to change your password

1. Click **Account** in the menu.
2. Type your **Current password**.
3. Type your **New password** twice. It must be **at least 12 characters**. A long sentence you can remember (a "passphrase") is better than a short complicated word. It must be different from the old one.
4. Press **Change password**.

Changing your password signs you out of any other computer or phone that was logged in.

**If you forget your password:** there is no "forgot password" button, because the site cannot send emails. Ask the person who looks after your website's server to reset it for you; they have a command for this.

---

## Other things worth knowing

* **Dashboard** shows how many orders are in each status, money from confirmed orders (Paid, Dispatched, Delivered), money still awaiting payment, how many paintings are available or sold, and new messages. Click the boxes to go straight to the list.
* **Audit log** is a history of changes made in the admin area (who did what and when). It is only for looking; you cannot change it.
* **View site** (bottom of the menu) opens your public website in a new tab so you can check your changes.
* The website needs the person who hosts it to keep backups of the database and of the photos. If you are unsure whether backups are being made, ask them.

## If something does not work

* Page says you are signed out: log in again.
* A red message appears after pressing Save: read it; it says what to fix (for example "Keep the title to 120 characters").
* You cannot see a change on the public website: wait a minute and refresh. Check that the painting or poem has **Published on the website** ticked.
* Anything else: contact the person who looks after your website, and tell them the exact message you saw.
