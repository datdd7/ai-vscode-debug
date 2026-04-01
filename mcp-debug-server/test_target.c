#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    int z = x + y;
    printf("Result: %d\n", z);
    for(int i = 0; i < 3; i++) {
        z += i;
    }
    return 0;
}
