#include <windows.h>
#include <stdio.h>

/* SPI_SETCLIENTAREAANIMATION (0x1043) is the specific API 
   for "Animate controls and elements within Windows".
*/
#ifndef SPI_SETCLIENTAREAANIMATION
#define SPI_SETCLIENTAREAANIMATION 0x1043
#endif

int main() {
    // TRUE = Enable, FALSE = Disable
    BOOL bEnable = TRUE; 

    // Calling the API with 0x03 ensures it updates the registry 
    // AND notifies all windows to refresh immediately.
    BOOL result = SystemParametersInfo(
        SPI_SETCLIENTAREAANIMATION, 
        0, 
        (PVOID)bEnable, 
        SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
    );

    if (result) {
        printf("Success: Animation controls and elements toggled.\n");
    } else {
        printf("Failure: Error code %lu\n", GetLastError());
    }

    return 0;
}