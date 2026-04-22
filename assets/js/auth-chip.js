// Implementation of buildUserChip function

async function buildUserChip() {
    // Get user data from Supabase
    const { user, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!user) {
        console.log('User not authenticated');
        return;
    }

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    // Create user chip element
    const chip = document.createElement('div');
    chip.classList.add('user-chip');

    // Profile picture
    const profilePicture = document.createElement('img');
    profilePicture.src = profile.profile_picture;
    profilePicture.alt = 'Profile Picture';
    chip.appendChild(profilePicture);

    // Username
    const username = document.createElement('span');
    username.textContent = profile.username;
    chip.appendChild(username);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown-menu');

    const viewAccount = document.createElement('button');
    viewAccount.textContent = 'View Account';
    viewAccount.onclick = () => {
        // Logic to view account
        window.location.href = '/account';
    };

    const signOut = document.createElement('button');
    signOut.textContent = 'Sign Out';
    signOut.onclick = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
            return;
        }
        window.location.reload();
    };

    dropdown.appendChild(viewAccount);
    dropdown.appendChild(signOut);
    chip.appendChild(dropdown);

    // Event listener to toggle dropdown
    chip.addEventListener('click', () => {
        dropdown.classList.toggle('show');
    });

    // Append chip to the body or preferred container
    document.body.appendChild(chip);
}

// Call the function on page load
window.onload = buildUserChip;
