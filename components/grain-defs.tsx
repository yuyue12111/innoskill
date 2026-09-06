/** riso 图块用的纸张颗粒 pattern,全站只定义一次(图块 svg 里 fill="url(#grain)") */
export function GrainDefs() {
	return (
		<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
			<defs>
				<pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
					<rect width="6" height="6" fill="none" />
					<circle cx="1" cy="1.6" r=".45" fill="#000" opacity=".055" />
					<circle cx="4.2" cy="3.4" r=".4" fill="#000" opacity=".045" />
					<circle cx="2.6" cy="5" r=".35" fill="#fff" opacity=".075" />
				</pattern>
			</defs>
		</svg>
	);
}
