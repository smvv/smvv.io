% Source code example
% Sander Mathijs van Veen
% October 5th, 2013

## Source code highlighting

~~~~~~~~~~~~~~~~~~ {.c .numberLines}
// Some example code here...
int main(int argc, void *argc) {
    return 1;
}
~~~~~~~~~~~~~~~~~~~~~~~~~~


## Missing runtime information in the compiler

When developing any reasonably large application it becomes important to think
about code reusability. So, you start writing more generic code, abstracting
away from the details. For example, you write a matrix multiplication function
for matrices of arbitrary size, instead of a function for matrices of specific
a size. The downside here is that the compiler now has the difficult task of
trying to fill in these details and if the compiler is not capable of doing so,
this gets postponed until runtime. And herein lies the problem, the code
generated for filling in the details at runtime slows down the program.

One solution to this problem would be to take the generic code and generate
specific functions for the situations where enough information is available.
For example, say you have written a function for matrix multiplication, for
matrices of any size. Now if you know — or the compiler can find out — that at
runtime this function gets used (quite) a few times on matrices of 1000 × 1000
elements then you can gain speed by specialising your function for matrices of
this size. In, for example, the Single assignment C compiler (sac2c) this can
be achieved by adding a directive to your code requesting the generation of a
specialised version of the matrix multiplication function.

