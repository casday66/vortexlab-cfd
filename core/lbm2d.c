#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static const int CX[9] = {0, 1, 0, -1, 0, 1, -1, -1, 1};
static const int CY[9] = {0, 0, 1, 0, -1, 1, 1, -1, -1};
static const int OPP[9] = {0, 3, 4, 1, 2, 7, 8, 5, 6};
static const double W[9] = {
    4.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 36.0,
    1.0 / 36.0,
    1.0 / 36.0,
    1.0 / 36.0
};

typedef struct {
    int nx;
    int ny;
    int steps;
    double reynolds;
    double u_in;
    double angle_deg;
    char obstacle[32];
    char output[256];
} Options;

typedef struct {
    int nx;
    int ny;
    int n;
    int step;
    double reynolds;
    double u_in;
    double radius;
    double length;
    double nu;
    double tau;
    double omega;
    double angle_rad;
    char obstacle[32];
    unsigned char *solid;
    double *f;
    double *f_next;
    double *rho;
    double *ux;
    double *uy;
} Sim;

static void usage(void) {
    printf("Usage: lbm2d [--nx N] [--ny N] [--steps N] [--re R] [--u U] [--angle DEG] [--obstacle TYPE] [--output PREFIX]\n");
    printf("Obstacle types: circle, semi, ellipse, rectangle, triangle, airfoil\n");
}

static Options default_options(void) {
    Options opt;
    opt.nx = 260;
    opt.ny = 120;
    opt.steps = 1800;
    opt.reynolds = 120.0;
    opt.u_in = 0.055;
    opt.angle_deg = 0.0;
    strcpy(opt.obstacle, "semi");
    strcpy(opt.output, "docs/demo/semi_re120");
    return opt;
}

static int parse_args(int argc, char **argv, Options *opt) {
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--help") == 0) {
            usage();
            return 0;
        } else if (strcmp(argv[i], "--nx") == 0 && i + 1 < argc) {
            opt->nx = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--ny") == 0 && i + 1 < argc) {
            opt->ny = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--steps") == 0 && i + 1 < argc) {
            opt->steps = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--re") == 0 && i + 1 < argc) {
            opt->reynolds = atof(argv[++i]);
        } else if (strcmp(argv[i], "--u") == 0 && i + 1 < argc) {
            opt->u_in = atof(argv[++i]);
        } else if (strcmp(argv[i], "--angle") == 0 && i + 1 < argc) {
            opt->angle_deg = atof(argv[++i]);
        } else if (strcmp(argv[i], "--obstacle") == 0 && i + 1 < argc) {
            snprintf(opt->obstacle, sizeof(opt->obstacle), "%s", argv[++i]);
        } else if (strcmp(argv[i], "--output") == 0 && i + 1 < argc) {
            snprintf(opt->output, sizeof(opt->output), "%s", argv[++i]);
        } else {
            fprintf(stderr, "Unknown or incomplete argument: %s\n", argv[i]);
            usage();
            return 0;
        }
    }
    return 1;
}

static double clamp(double v, double lo, double hi) {
    if (v < lo) {
        return lo;
    }
    if (v > hi) {
        return hi;
    }
    return v;
}

static int idx(const Sim *sim, int x, int y) {
    return y * sim->nx + x;
}

static int qidx(const Sim *sim, int d, int i) {
    return d * sim->n + i;
}

static double feq(int d, double rho, double ux, double uy) {
    double eu = CX[d] * ux + CY[d] * uy;
    double u2 = ux * ux + uy * uy;
    return W[d] * rho * (1.0 + 3.0 * eu + 4.5 * eu * eu - 1.5 * u2);
}

static void local_point(const Sim *sim, double x, double y, double *lx, double *ly) {
    double cx = sim->nx * 0.30;
    double cy = sim->ny * 0.50;
    double dx = x - cx;
    double dy = y - cy;
    double c = cos(-sim->angle_rad);
    double s = sin(-sim->angle_rad);
    *lx = c * dx - s * dy;
    *ly = s * dx + c * dy;
}

static int inside_triangle(double x, double y, double size) {
    double h = size * sqrt(3.0) / 2.0;
    double ax = -size / 2.0;
    double ay = h / 3.0;
    double bx = size / 2.0;
    double by = h / 3.0;
    double cx = 0.0;
    double cy = -2.0 * h / 3.0;
    double d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by);
    double d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
    double d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
    int has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
    int has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
    return !(has_neg && has_pos);
}

static int inside_airfoil(double x, double y, double chord) {
    double xc = (x + chord / 2.0) / chord;
    if (xc <= 0.0 || xc >= 1.0) {
        return 0;
    }
    double t = 0.12;
    double yt = 5.0 * t * chord * (
        0.2969 * sqrt(xc)
        - 0.1260 * xc
        - 0.3516 * xc * xc
        + 0.2843 * xc * xc * xc
        - 0.1015 * xc * xc * xc * xc
    );
    return fabs(y) <= fmax(1.0, yt);
}

static int obstacle_contains(const Sim *sim, double x, double y) {
    double lx, ly;
    local_point(sim, x, y, &lx, &ly);
    double r = sim->radius;
    if (strcmp(sim->obstacle, "circle") == 0) {
        return lx * lx + ly * ly <= r * r;
    }
    if (strcmp(sim->obstacle, "semi") == 0) {
        return lx >= 0.0 && lx * lx + ly * ly <= r * r;
    }
    if (strcmp(sim->obstacle, "ellipse") == 0) {
        double rx = r * 1.35;
        double ry = r * 0.75;
        return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1.0;
    }
    if (strcmp(sim->obstacle, "rectangle") == 0) {
        return fabs(lx) <= r * 0.75 && fabs(ly) <= r * 1.10;
    }
    if (strcmp(sim->obstacle, "triangle") == 0) {
        return inside_triangle(lx, ly, r * 1.8);
    }
    if (strcmp(sim->obstacle, "airfoil") == 0) {
        return inside_airfoil(lx, ly, r * 3.0);
    }
    return 0;
}

static void build_solid_mask(Sim *sim) {
    for (int y = 0; y < sim->ny; y++) {
        for (int x = 0; x < sim->nx; x++) {
            int i = idx(sim, x, y);
            sim->solid[i] = 0;
            if (y == 0 || y == sim->ny - 1) {
                sim->solid[i] = 1;
            } else if (obstacle_contains(sim, x + 0.5, y + 0.5)) {
                sim->solid[i] = 1;
            }
        }
    }
}

static void set_eq_cell(Sim *sim, int x, int y, double rho, double ux, double uy) {
    int i = idx(sim, x, y);
    sim->rho[i] = rho;
    sim->ux[i] = ux;
    sim->uy[i] = uy;
    for (int d = 0; d < 9; d++) {
        sim->f[qidx(sim, d, i)] = feq(d, rho, ux, uy);
    }
}

static void initialize(Sim *sim, const Options *opt) {
    sim->nx = opt->nx;
    sim->ny = opt->ny;
    sim->n = opt->nx * opt->ny;
    sim->step = 0;
    sim->reynolds = opt->reynolds;
    sim->u_in = opt->u_in;
    sim->radius = fmax(8.0, sim->ny / 7.0);
    sim->length = 2.0 * sim->radius;
    sim->angle_rad = opt->angle_deg * M_PI / 180.0;
    snprintf(sim->obstacle, sizeof(sim->obstacle), "%s", opt->obstacle);

    double raw_nu = sim->u_in * sim->length / sim->reynolds;
    sim->nu = clamp(raw_nu, 0.0045, 0.18);
    sim->tau = 0.5 + 3.0 * sim->nu;
    sim->omega = 1.0 / sim->tau;

    sim->solid = (unsigned char *)calloc((size_t)sim->n, sizeof(unsigned char));
    sim->f = (double *)calloc((size_t)sim->n * 9, sizeof(double));
    sim->f_next = (double *)calloc((size_t)sim->n * 9, sizeof(double));
    sim->rho = (double *)calloc((size_t)sim->n, sizeof(double));
    sim->ux = (double *)calloc((size_t)sim->n, sizeof(double));
    sim->uy = (double *)calloc((size_t)sim->n, sizeof(double));
    if (!sim->solid || !sim->f || !sim->f_next || !sim->rho || !sim->ux || !sim->uy) {
        fprintf(stderr, "Allocation failed.\n");
        exit(1);
    }

    build_solid_mask(sim);
    for (int y = 0; y < sim->ny; y++) {
        for (int x = 0; x < sim->nx; x++) {
            int i = idx(sim, x, y);
            double u = sim->solid[i] ? 0.0 : sim->u_in;
            double seed_x = exp(-pow((x - sim->nx * 0.28) / fmax(1.0, sim->nx * 0.18), 2.0));
            double v = sim->solid[i] ? 0.0 : 0.0012 * sin(2.0 * M_PI * y / sim->ny) * seed_x;
            set_eq_cell(sim, x, y, 1.0, u, v);
        }
    }
}

static void free_sim(Sim *sim) {
    free(sim->solid);
    free(sim->f);
    free(sim->f_next);
    free(sim->rho);
    free(sim->ux);
    free(sim->uy);
}

static void apply_boundaries(Sim *sim) {
    for (int y = 1; y < sim->ny - 1; y++) {
        set_eq_cell(sim, 0, y, 1.0, sim->u_in, 0.0);
        set_eq_cell(sim, 1, y, 1.0, sim->u_in, 0.0);
        int out = idx(sim, sim->nx - 1, y);
        int prev = idx(sim, sim->nx - 2, y);
        for (int d = 0; d < 9; d++) {
            sim->f[qidx(sim, d, out)] = sim->f[qidx(sim, d, prev)];
        }
    }
}

static void step_lbm(Sim *sim, double *cd, double *cl, double *mass) {
    memset(sim->f_next, 0, (size_t)sim->n * 9 * sizeof(double));
    double force_x = 0.0;
    double force_y = 0.0;
    double mass_sum = 0.0;
    int fluid_count = 0;

    for (int y = 0; y < sim->ny; y++) {
        for (int x = 0; x < sim->nx; x++) {
            int i = idx(sim, x, y);
            if (sim->solid[i]) {
                sim->rho[i] = 1.0;
                sim->ux[i] = 0.0;
                sim->uy[i] = 0.0;
                continue;
            }
            double rho = 0.0;
            double ux = 0.0;
            double uy = 0.0;
            for (int d = 0; d < 9; d++) {
                double value = sim->f[qidx(sim, d, i)];
                rho += value;
                ux += value * CX[d];
                uy += value * CY[d];
            }
            if (rho <= 1e-12 || !isfinite(rho)) {
                rho = 1.0;
                ux = sim->u_in;
                uy = 0.0;
            } else {
                ux /= rho;
                uy /= rho;
            }
            double speed2 = ux * ux + uy * uy;
            if (speed2 > 0.20) {
                double scale = sqrt(0.20 / speed2);
                ux *= scale;
                uy *= scale;
            }
            sim->rho[i] = rho;
            sim->ux[i] = ux;
            sim->uy[i] = uy;
            mass_sum += rho;
            fluid_count++;

            for (int d = 0; d < 9; d++) {
                double f_old = sim->f[qidx(sim, d, i)];
                double f_post = f_old - sim->omega * (f_old - feq(d, rho, ux, uy));
                int nx2 = x + CX[d];
                int ny2 = y + CY[d];
                if (nx2 < 0 || nx2 >= sim->nx || ny2 < 0 || ny2 >= sim->ny) {
                    sim->f_next[qidx(sim, OPP[d], i)] += f_post;
                    continue;
                }
                int j = idx(sim, nx2, ny2);
                if (sim->solid[j]) {
                    sim->f_next[qidx(sim, OPP[d], i)] += f_post;
                    force_x += 2.0 * f_post * CX[d];
                    force_y += 2.0 * f_post * CY[d];
                } else {
                    sim->f_next[qidx(sim, d, j)] += f_post;
                }
            }
        }
    }

    double *tmp = sim->f;
    sim->f = sim->f_next;
    sim->f_next = tmp;
    apply_boundaries(sim);
    sim->step++;

    double norm = fmax(1e-12, 0.5 * sim->u_in * sim->u_in * sim->length);
    *cd = force_x / norm;
    *cl = force_y / norm;
    *mass = mass_sum / fmax(1, fluid_count);
}

static double vorticity_at(const Sim *sim, int x, int y) {
    if (x <= 0 || y <= 0 || x >= sim->nx - 1 || y >= sim->ny - 1) {
        return 0.0;
    }
    int left = idx(sim, x - 1, y);
    int right = idx(sim, x + 1, y);
    int down = idx(sim, x, y - 1);
    int up = idx(sim, x, y + 1);
    return 0.5 * (sim->uy[right] - sim->uy[left]) - 0.5 * (sim->ux[up] - sim->ux[down]);
}

static double max_speed(const Sim *sim) {
    double best = 0.0;
    for (int i = 0; i < sim->n; i++) {
        if (sim->solid[i]) {
            continue;
        }
        double speed = sqrt(sim->ux[i] * sim->ux[i] + sim->uy[i] * sim->uy[i]);
        if (speed > best) {
            best = speed;
        }
    }
    return best;
}

static void color_speed(double value, unsigned char *r, unsigned char *g, unsigned char *b) {
    double v = clamp(value, 0.0, 1.0);
    *r = (unsigned char)clamp(255.0 * fmax(0.0, 1.7 * v - 0.45), 0.0, 255.0);
    *g = (unsigned char)clamp(255.0 * sin(M_PI * v), 0.0, 255.0);
    *b = (unsigned char)clamp(255.0 * fmax(0.0, 1.2 - 1.4 * v), 0.0, 255.0);
}

static void color_signed(double value, unsigned char *r, unsigned char *g, unsigned char *b) {
    double v = clamp((value + 1.0) * 0.5, 0.0, 1.0);
    if (v < 0.5) {
        double t = v / 0.5;
        *r = (unsigned char)(15 + 80 * t);
        *g = (unsigned char)(75 + 130 * t);
        *b = (unsigned char)(160 + 70 * t);
    } else {
        double t = (v - 0.5) / 0.5;
        *r = (unsigned char)(230 + 25 * t);
        *g = (unsigned char)(230 - 120 * t);
        *b = (unsigned char)(220 - 190 * t);
    }
}

static void write_ppm_speed(const Sim *sim, const char *path) {
    FILE *fp = fopen(path, "wb");
    if (!fp) {
        fprintf(stderr, "Could not open %s\n", path);
        return;
    }
    fprintf(fp, "P6\n%d %d\n255\n", sim->nx, sim->ny);
    double scale = fmax(0.06, sim->u_in * 2.6);
    for (int y = 0; y < sim->ny; y++) {
        for (int x = 0; x < sim->nx; x++) {
            int i = idx(sim, x, y);
            unsigned char rgb[3];
            if (sim->solid[i]) {
                rgb[0] = 3;
                rgb[1] = 8;
                rgb[2] = 10;
            } else {
                double speed = sqrt(sim->ux[i] * sim->ux[i] + sim->uy[i] * sim->uy[i]);
                color_speed(speed / scale, &rgb[0], &rgb[1], &rgb[2]);
            }
            fwrite(rgb, 1, 3, fp);
        }
    }
    fclose(fp);
}

static void write_ppm_vorticity(const Sim *sim, const char *path) {
    FILE *fp = fopen(path, "wb");
    if (!fp) {
        fprintf(stderr, "Could not open %s\n", path);
        return;
    }
    fprintf(fp, "P6\n%d %d\n255\n", sim->nx, sim->ny);
    double scale = fmax(0.012, sim->u_in * 0.55);
    for (int y = 0; y < sim->ny; y++) {
        for (int x = 0; x < sim->nx; x++) {
            int i = idx(sim, x, y);
            unsigned char rgb[3];
            if (sim->solid[i]) {
                rgb[0] = 3;
                rgb[1] = 8;
                rgb[2] = 10;
            } else {
                color_signed(vorticity_at(sim, x, y) / scale, &rgb[0], &rgb[1], &rgb[2]);
            }
            fwrite(rgb, 1, 3, fp);
        }
    }
    fclose(fp);
}

int main(int argc, char **argv) {
    Options opt = default_options();
    if (!parse_args(argc, argv, &opt)) {
        return 1;
    }
    if (opt.nx < 80 || opt.ny < 50 || opt.steps < 1) {
        fprintf(stderr, "Invalid grid or step count.\n");
        return 1;
    }

    Sim sim;
    memset(&sim, 0, sizeof(sim));
    initialize(&sim, &opt);

    char csv_path[512];
    char speed_path[512];
    char vort_path[512];
    snprintf(csv_path, sizeof(csv_path), "%s_timeseries.csv", opt.output);
    snprintf(speed_path, sizeof(speed_path), "%s_speed.ppm", opt.output);
    snprintf(vort_path, sizeof(vort_path), "%s_vorticity.ppm", opt.output);

    FILE *csv = fopen(csv_path, "w");
    if (!csv) {
        fprintf(stderr, "Could not open %s\n", csv_path);
        free_sim(&sim);
        return 1;
    }
    fprintf(csv, "step,cd_proxy,cl_proxy,mass,effective_re,tau,probe_vorticity,max_speed\n");

    double cd = 0.0;
    double cl = 0.0;
    double mass = 1.0;
    for (int step = 0; step < opt.steps; step++) {
        step_lbm(&sim, &cd, &cl, &mass);
        if (step % 2 == 0 || step == opt.steps - 1) {
            double effective_re = sim.u_in * sim.length / sim.nu;
            int probe_x = (int)(sim.nx * 0.62);
            int probe_y = (int)(sim.ny / 2 + sim.radius * 0.55);
            double probe_vort = vorticity_at(&sim, probe_x, probe_y);
            fprintf(
                csv,
                "%d,%.10f,%.10f,%.10f,%.6f,%.8f,%.10f,%.10f\n",
                sim.step,
                cd,
                cl,
                mass,
                effective_re,
                sim.tau,
                probe_vort,
                max_speed(&sim)
            );
        }
    }
    fclose(csv);
    write_ppm_speed(&sim, speed_path);
    write_ppm_vorticity(&sim, vort_path);

    printf("VortexLab-CFD C solver complete\n");
    printf("grid: %d x %d\n", sim.nx, sim.ny);
    printf("obstacle: %s\n", sim.obstacle);
    printf("requested Re: %.3f\n", sim.reynolds);
    printf("effective Re: %.3f\n", sim.u_in * sim.length / sim.nu);
    printf("tau: %.6f\n", sim.tau);
    printf("final Cd proxy: %.6f\n", cd);
    printf("final Cl proxy: %.6f\n", cl);
    printf("wrote: %s\n", csv_path);
    printf("wrote: %s\n", speed_path);
    printf("wrote: %s\n", vort_path);

    free_sim(&sim);
    return 0;
}
