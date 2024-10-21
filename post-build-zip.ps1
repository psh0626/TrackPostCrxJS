
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

Set-Location publish
git add dist.zip
git commit
git push origin main

Set-Location ..
git add publish
git commit -m "Update submodule reference"
git push origin main