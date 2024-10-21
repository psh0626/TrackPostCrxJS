
$directoryPath = ".\publish"

# Check if the directory already exists
if (-not (Test-Path -Path $directoryPath)) {
    # If the directory does not exist, create it
    mkdir $directoryPath
    Write-Output "Directory created: $directoryPath"
} else {
    Write-Output "Directory already exists: $directoryPath"
}

Write-Output "Creating dist.zip..."
Compress-Archive -Path "dist\\*" -DestinationPath "publish\\dist.zip" -Force
Write-Output "dist.zip file has been created!"

# try{
# git remote add publish_dist https://github.com/shawnpark9494/TrackPostExtZip.git
# }catch{
#   exit;
# }
# git add publish/dist.zip

# Write-Output "Creating commit..."
# git commit -m "Add build artifacts"

# # Replace 'your-remote' with the desired remote name and 'your-branch' with the desired branch name
# $remote = "publish_dist"
# $branch = "main"

# Write-Output "Pushing changes to remote..."
# git push $remote $branch --force

# git remote rm publish_dist