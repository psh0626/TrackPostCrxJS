
Write-Output "Creating dist.zip..."
Compress-Archive -Path "dist\\*" -DestinationPath "dist.zip" -Force

# Write-Output "Pushing Dist.zip to the Repo: TrackPostExtZip"
# git checkout --orphan dist_branch
# git reset
# git add .\dist.zip
# git commit -m "Update dist.zip"
# git push -f dist main