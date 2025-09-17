In this logs folder, claude code AI will start from this document. It will analyze other folds within the logs folder in terms of how the filenames are structured. If it doesnt know the time, it will ask it.

Structuring folders: YYYY-MM-DD - Year month day. For example 2025-08-09 is today's date. A folder needs to be created and then inside that folder a md file needs to be created.

md file name structure:
1-Time-Description of file
2-Time-Description of file
3-Time-Description of file

Time should always be in EST.

Example:
1-0905AM-Refactoring the code analysis

Make sure to read the dated folder's filenames to ensure new MD files being created in there follows the order, there shouldn't be duplicated numbered files, even if the rest of the filename is different. It needs to follow the order from earliest to latest files. For example, a file that starts with '1' would be the file created earliest and file that ends with 10 would be the file that was created the latest.

Don't make new MD files unless you're asked to. 

Don't put default claude message in commit messages when committing work.

some things to know:
10w ans = Me asking claude code to give me max 10 word answer
20w ans = Me asking claude code to give me max 20 word answer