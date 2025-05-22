import math

class MeyerhofCalculator:
    def __init__(self, estratos, nfreatico, beta, df, l, b):
        self.estratos = estratos
        self.nfreatico = nfreatico
        self.beta = beta
        self.df = df
        self.l = l
        self.b = b
        self.peso_agua = 1

    def calcular(self):
        qu_list = []
        qa_list = []

        for i, df in enumerate(self.df):
            for j, l in enumerate(self.l):
                b = self.b[j]
                c, phi, peso_esp, peso_sat, peso_sum, ub = self.obtener_estrato(df)

                q, gamma = self.calcular_q_gamma(df, b, peso_esp, peso_sat, peso_sum, ub)

                nq = (math.tan(math.radians(45 + phi / 2)))**2 * math.exp(math.pi * math.tan(math.radians(phi))) if phi != 0 else 1
                nc = (nq - 1) / math.tan(math.radians(phi)) if phi != 0 else 5.14
                ng = (nq - 1) * math.tan(math.radians(1.4 * phi)) if phi != 0 else 0

                fcs = 1 + b * nq / (l * nc)
                fqs = 1 + b * math.tan(math.radians(phi)) / l
                fgs = 1 - 0.4 * b / l

                if df / b <= 1:
                    fqd = 1 + 2 * math.tan(math.radians(phi)) * (1 - math.sin(math.radians(phi)))**2 * (df / b) if phi != 0 else 1
                else:
                    fqd = 1 + 2 * math.tan(math.radians(phi)) * (1 - math.sin(math.radians(phi)))**2 * math.atan(df / b) if phi != 0 else 1

                fcd = fqd - (1 - fqd) / (nc * math.tan(math.radians(phi))) if phi != 0 else 1 + 0.4 * df / b
                fgd = 1
                fci = (1 - self.beta / 90)**2
                fqi = fci
                fgi = 1 - self.beta / phi if phi != 0 else 1

                qu = c * nc * fcs * fcd * fci + q * nq * fqs * fqd * fqi + 0.5 * gamma * b * ng * fgs * fgd * fgi
                qa = qu / 3
                qu_list.append(qu)
                qa_list.append(qa)

        return qu_list, qa_list

    def obtener_estrato(self, df):
        for k, estrato in enumerate(self.estratos):
            d0 = 0 if k == 0 else self.estratos[k - 1][0]
            d1 = estrato[0]
            if d1 > df >= d0:
                peso_esp, peso_sat, phi, c = estrato[1:5]
                peso_sum = peso_sat - self.peso_agua
                return c, phi, peso_esp, peso_sat, peso_sum, k
        return 0, 0, 0, 0, 0, 0

    def calcular_q_gamma(self, df, b, peso_esp, peso_sat, peso_sum, ub):
        q = 0
        if self.nfreatico <= df:
            gamma = peso_sum
            for l_idx in range(ub + 1):
                ant = 0 if l_idx == 0 else self.estratos[l_idx - 1][0]
                if self.estratos[l_idx][0] <= self.nfreatico:
                    q += (self.estratos[l_idx][0] - ant) * self.estratos[l_idx][1]
                else:
                    if l_idx == ub:
                        q += (df - ant) * (self.estratos[l_idx][2] - self.peso_agua)
                    else:
                        q += (self.nfreatico - ant) * self.estratos[l_idx][1] + \
                             (self.estratos[l_idx][0] - self.nfreatico) * (self.estratos[l_idx][2] - self.peso_agua)
        else:
            d = self.nfreatico - df
            if d <= b:
                peso_prima = peso_sum
                gamma = peso_prima + d / b * (peso_esp - peso_prima)
            else:
                gamma = peso_esp

            for m in range(ub + 1):
                ant = 0 if m == 0 else self.estratos[m - 1][0]
                altura = df - ant if m == ub else self.estratos[m][0] - ant
                q += altura * self.estratos[m][1]

        return q, gamma
