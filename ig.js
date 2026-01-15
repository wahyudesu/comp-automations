import { createPlaywrightRouter } from "crawlee";

export const router = createPlaywrightRouter();

const getElementText = async (page, regex) => {
    const element = await page.getByText(regex);
    return element ? await element.textContent() : null;
};

router.addDefaultHandler(async ({ request, page, pushData }) => {
    const username = request.url.split('/').filter(Boolean).pop();

    const followersText = await getElementText(page, /[0-9,.mMkK]+ followers/);
    const followersCount = followersText ? followersText.split(" ")[0] : 0;

    const followingText = await getElementText(page, /[0-9,.mMkK]+ following/);
    const followingCount = followingText ? followingText.split(" ")[0] : 0;

    const postsText = await getElementText(page, /[0-9,.mMkK]+ posts?/);
    const postsCount = postsText ? postsText.split(" ")[0] : 0;

    const profilePicture = await page.getAttribute(`img[alt="${username}'s profile picture"]`, 'src');

    await pushData({
        username,
        followersCount,
        followingCount,
        postsCount,
        profilePicture,
    });
});